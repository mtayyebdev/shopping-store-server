import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";
import slugify from "slugify";
import {
  DeleteImageFromCloudinary,
  UploadToCloudinary,
} from "../utils/uploadFile.js";
import Category from "../models/category.model.js";

const productsController = asyncHandler(async (req, res) => {
  const products = await Product.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category_info",
        pipeline: [
          {
            $project: { name: 1, slug: 1, _id: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$category_info",
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "Products found",
    data: products,
  });
});

const singleProductController = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    throw new APIError("Product not found.", 400);
  }

  const product = await Product.findOne({ slug });

  if (!product) {
    throw new APIError("Product not found.", 400);
  }

  const category = await Category.findById(product.category);

  return res.status(200).json({
    success: true,
    message: "Product found.",
    data: {
      product,
      category,
      reviews: product.reviews,
    },
  });
});

const searchProductController = asyncHandler(async (req, res) => {
  const { s } = req.query;
  const {
    minPrice = 0,
    maxPrice = 10000000,
    ratings = 0,
    color = [],
    size = [],
    brand,
    sortBy = "bestMatch",
    category,
    page = 1,
    limit = 10,
  } = req.body;

  const matchStage = {
    price: { $gte: minPrice, $lte: maxPrice },
    ratings: { $gte: ratings },
    color: color.length > 0 ? { $in: color } : { $exists: true },
    size: size.length > 0 ? { $in: size } : { $exists: true },
  };

  if (brand) {
    matchStage.brand = brand;
  }

  const products = await Product.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categories_info",
        pipeline: [
          {
            $project: { name: 1, slug: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$categories_info",
    },
    {
      $match: {
        $or: [
          {
            name: {
              $regex: s,
              $options: "i",
            },
          },
          {
            "categories_info.name": category,
          },
        ],
      },
    },
    {
      $match: matchStage,
    },
    {
      $sort: {
        price: sortBy === "LtoH" ? 1 : sortBy === "HtoL" ? -1 : 0,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        name: 1,
        slug: 1,
        price: 1,
        discountPrice: 1,
        discount: 1,
        image: 1,
        ratings: 1,
        category_info: 1,
        sold: 1,
        createdAt: 1,
        ratings: 1,
        numReviews: 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "Products found.",
    data: products,
  });
});

const createProductReviewController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { message, rating } = req.body;
  const files = req.files || [];

  if (!productId) {
    throw new APIError("Product ID not found.", 404);
  }

  if (!message || !rating) {
    throw new APIError("Product message and Ratings is required.", 404);
  }

  const product = await Product.findById(productId);
  const user = await User.findById(req.user._id);

  if (!product) {
    throw new APIError("Invalid Product ID.", 404);
  }

  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === user._id.toString()
  );

  if (alreadyReviewed) {
    throw new APIError("You already reviewed this product.", 400);
  }

  const review = {
    username: user.name,
    avatar: user.avatar,
    message,
    rating: Number(rating),
    user: user._id,
    images: [],
  };

  if (files?.length !== 0) {
    await Promise.all(
      files.map(async (f) => {
        const uploadedImage = await UploadToCloudinary(f?.path, "reviews");
        review.images.push({
          url: uploadedImage.secure_url,
          publicId: uploadedImage.public_id,
        });
      })
    );
  }

  product.reviews.push(review);

  product.numReviews = product.reviews.length;

  let sumOfRatings = 0;
  product.reviews.forEach((r) => (sumOfRatings += r.rating));

  product.ratings =
    product.numReviews === 0 ? 0 : sumOfRatings / product.numReviews;

  await product.save();

  return res.status(200).json({
    success: true,
    message: "Product review added successfully.",
  });
});

const topRatedProductsController = asyncHandler(async (req, res) => {
  const products = await Product.find({})
    .sort({ ratings: -1 })
    .limit(5)
    .select(
      "name slug price discountPrice image ratings sold numReviews discount"
    );
  return res.status(200).json({
    success: true,
    message: "Top rated products fetched successfully.",
    data: products,
  });
});

const featuredProductsController = asyncHandler(async (req, res) => {
  const products = await Product.find({ isFeatured: true })
    .sort({ createdAt: -1 })
    .select(
      "name slug price discountPrice image ratings sold numReviews discount"
    );
  return res.status(200).json({
    success: true,
    message: "Featured products fetched successfully.",
    data: products,
  });
});

const newArrivalsProductsController = asyncHandler(async (req, res) => {
  const products = await Product.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select(
      "name slug price discountPrice image ratings sold numReviews discount"
    );

  return res.status(200).json({
    success: true,
    message: "New arrivals products fetched successfully.",
    data: products,
  });
});

const popularProductsController = asyncHandler(async (req, res) => {
  const products = await Product.find({})
    .sort({ sold: -1 })
    .limit(10)
    .select(
      "name slug price discountPrice image ratings sold numReviews discount"
    );
  return res.status(200).json({
    success: true,
    message: "Popular products fetched successfully.",
    data: products,
  });
});

const relatedProductsController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    throw new APIError("Product ID not found.", 404);
  }
  const product = await Product.findById(productId);

  if (!product) {
    throw new APIError("Invalid Product ID.", 404);
  }

  const products = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
  })
    .limit(10)
    .select(
      "name slug price discountPrice image ratings sold numReviews discount"
    );

  return res.status(200).json({
    success: true,
    message: "Related products fetched successfully.",
    data: products,
  });
});

const deleteReviewController = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;
  if (!productId || !reviewId) {
    throw new APIError("Product ID and Review ID are required.", 404);
  }
  const product = await Product.findById(productId);

  if (!product) {
    throw new APIError("Invalid Product ID.", 404);
  }

  const review = product.reviews.find(
    (r) => r._id.toString() === reviewId.toString()
  );

  if (!review) {
    throw new APIError("Review not found.", 404);
  }

  product.reviews = product.reviews.filter(
    (r) => r._id.toString() !== reviewId.toString()
  );

  product.numReviews = product.reviews.length;
  let sumOfRatings = 0;
  product.reviews.forEach((r) => (sumOfRatings += r.rating));
  product.ratings =
    product.numReviews === 0 ? 0 : sumOfRatings / product.numReviews;

  await product.save();

  return res.status(200).json({
    success: true,
    message: "Review deleted successfully.",
  });
});

// admin products controllers..................
const createProductAdminController = asyncHandler(async (req, res) => {
  const {
    name,
    brand = "No Brand",
    categoryId,
    price,
    discountPrice,
    stock,
    discount,
    tags = [],
    shippingPrice,
    longDesc = "",
    shortDesc,
    returned,
    sku,
    specifications = [],
    isFeatured,
    size = [],
    color = [],
  } = req.body;
  const files = req.files || [];
  const file = req.file || "";

  if (files.length === 0) {
    throw new APIError("Images are required", 400);
  }

  if (files.length > 16) {
    throw new APIError("You can upload maximum 16 images", 400);
  }

  if (!file.path) {
    throw new APIError("Product view images is required", 400);
  }

  const productSlug = slugify(name);

  let images = [];
  await Promise.all(
    files.map(async (f) => {
      const uploadedFile = await UploadToCloudinary(f.path);
      images.push({
        url: uploadedFile.secure_url,
        publicId: uploadedFile.public_id,
      });
    })
  );

  if (images.length === 0) {
    throw new APIError("Something went wrong during files uploading", 400);
  }

  const image = await UploadToCloudinary(file.path);
  const img = {
    url: image.secure_url,
    publicId: image.public_id,
  };

  const product = await Product.create({
    name,
    price,
    discount,
    discountPrice,
    tags,
    image: img,
    images,
    longDesc,
    shortDesc,
    slug: productSlug,
    color,
    size,
    isFeatured,
    specifications,
    shippingPrice,
    returned,
    stock,
    brand,
    category: categoryId,
    sku,
  });

  if (!product) {
    throw new APIError("Something went wrong", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Product created.",
  });
});

const productsAdminController = asyncHandler(async (req, res) => {
  const products = await Product.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category_info",
      },
    },
    {
      $unwind: "$category_info",
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "Products found.",
    data: products,
  });
});

const singleProductAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Product Id is required.", 404);
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new APIError("Product not found", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Product found",
    data: product,
  });
});

const updateProductAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    price,
    discountPrice,
    stock,
    discount,
    tags = [],
    shippingPrice,
    longDesc,
    shortDesc,
    returned,
    sku,
    specifications = [],
    isFeatured,
    size = [],
    color = [],
    brand = "No Brand",
    category,
    imgsIdsToDelete = [],
  } = req.body;
  const files = req.files || [];
  const file = req.file || "";

  if (!id) {
    throw new APIError("Product Id is required.", 404);
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new APIError("Product not found", 400);
  }

  if (name) {
    product.name = name;
    product.slug = slugify(name);
  }
  product.price = price || product.price;
  product.discountPrice = discountPrice || product.discountPrice;
  product.stock = stock || product.stock;
  product.discount = discount || product.discount;
  product.tags = tags || product.tags;
  product.shippingPrice = shippingPrice || product.shippingPrice;
  product.longDesc = longDesc || product.longDesc;
  product.shortDesc = shortDesc || product.shortDesc;
  product.returned = returned || product.returned;
  product.sku = sku || product.sku;
  product.specifications = specifications || product.specifications;
  product.size = size || product.size;
  product.color = color || product.color;
  product.brand = brand || product.brand;
  product.category = category || product.category;
  if (product.isFeatured !== isFeatured) {
    product.isFeatured = isFeatured;
  }

  if (files?.length > 0) {
    await Promise.all(
      files.map(async (f) => {
        const uploadedFile = await UploadToCloudinary(f.path, "products");
        product.images.push({
          url: uploadedFile.secure_url,
          publicId: uploadedFile.public_id,
        });
      })
    );
  }

  if (imgsIdsToDelete?.length > 0) {
    const newImages = product.images?.filter(
      (i) => !imgsIdsToDelete.includes(i.publicId)
    );

    await Promise.all(
      imgsIdsToDelete.map(async (pId) => {
        await DeleteImageFromCloudinary(pId);
      })
    );

    product.images = newImages;
  }

  if (file.path) {
    const uploadedImage = await UploadToCloudinary(file.path, "products");
    if (uploadedImage?.secure_url) {
      if (product.image?.publicId) {
        await DeleteImageFromCloudinary(product.image.publicId);
      }
      product.image = {
        url: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
      };
    }
  }

  await product.save();

  return res.status(200).json({
    success: true,
    message: "Product updated successfully.",
  });
});

const deleteProductAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Product Id is required.", 404);
  }

  await Product.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Product deleted successfully.",
  });
});

export {
  productsController,
  singleProductController,
  searchProductController,
  createProductReviewController,
  topRatedProductsController,
  featuredProductsController,
  newArrivalsProductsController,
  popularProductsController,
  relatedProductsController,
  deleteReviewController,
  // admin controllers
  createProductAdminController,
  productsAdminController,
  singleProductAdminController,
  updateProductAdminController,
  deleteProductAdminController,
};
