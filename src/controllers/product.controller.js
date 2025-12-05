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
  const { s, c } = req.query;
  const {
    minPrice = 0,
    maxPrice = 10000000,
    ratings = 0,
    color = [],
    size = [],
    brand,
    sortBy = "bestMatch",
    page = 1,
    limit = 10,
  } = req.body;

  const matchStage = {};

  if (minPrice) {
    matchStage.price = { ...matchStage.price, $gte: minPrice };
  }
  if (maxPrice) {
    matchStage.price = { ...matchStage.price, $lte: maxPrice };
  }

  if (ratings) {
    matchStage.ratings = { $gte: ratings };
  }

  if (color.length > 0) {
    matchStage.color = { $in: color };
  }

  if (size.length > 0) {
    matchStage.size = { $in: size };
  }

  if (brand) {
    matchStage.brand = brand;
  }

  const sortStage = {};

  if (sortBy === "LtoH") sortStage.price = 1;
  if (sortBy === "HtoL") sortStage.price = -1;

  const pipeline = [
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
              $regex: String(s),
              $options: "i",
            },
          },
          {
            "categories_info.slug": {
              $regex: String(c),
              $options: "i",
            },
          },
        ],
      },
    },
    {
      $match: matchStage,
    },
  ];

  if (Object.keys(sortStage).length > 0) {
    pipeline.push({ $sort: sortStage });
  }

  pipeline.push(
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
        oldPrice: 1,
        discount: 1,
        image: 1,
        ratings: 1,
        category_info: 1,
        sold: 1,
        createdAt: 1,
        ratings: 1,
        numReviews: 1,
      },
    }
  );

  const products = await Product.aggregate(pipeline);

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
    if (files.length > 4) {
      throw new APIError("You can upload maximum 4 images for review.", 400);
    }
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

  if (review.user.toString() !== req.user._id.toString()) {
    throw new APIError("You are not authorized to delete this review.", 403);
  }
  const reviewImgsIds = [];
  review.images.forEach((i) => {
    reviewImgsIds.push(i.publicId);
  });

  product.reviews = product.reviews.filter(
    (r) => r._id.toString() !== reviewId.toString()
  );

  await Promise.all(
    reviewImgsIds.map(async (imgs) => await DeleteImageFromCloudinary(imgs))
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
    oldPrice,
    stock,
    tags = [],
    shippingPrice,
    longDesc = "",
    shortDesc = "",
    returned,
    sku,
    specifications = [],
    isFeatured,
    size = [],
    color = [],
  } = req.body;
  const files = req.files ? req.files["images"] || [] : [];
  const file = req.files ? req.files["image"][0] || {} : {};

  if (files.length === 0) {
    throw new APIError("Images are required", 400);
  }

  if (files.length > 16) {
    throw new APIError("You can upload maximum 16 images", 400);
  }

  if (!file.path) {
    throw new APIError("Product view image is required", 400);
  }

  const productSlug = slugify(name).toLowerCase();

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

  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);

  const product = await Product.create({
    name,
    price,
    discount,
    oldPrice,
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
    oldPrice,
    stock,
    tags,
    shippingPrice,
    longDesc,
    shortDesc,
    returned,
    sku,
    specifications,
    isFeatured,
    size,
    color,
    brand,
    category,
    imgsIdsToDelete,
  } = req.body;

  const files = req.files ? req.files["images"] || [] : [];
  const file = req.files
    ? req.files["image"]
      ? req.files["image"][0]
      : {}
    : {};

  if (!id) {
    throw new APIError("Product Id is required.", 404);
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new APIError("Product not found", 400);
  }

  if (name) {
    product.name = name;
    product.slug = slugify(name).toLowerCase();
  }

  if (price || oldPrice) {
    const discount = Math.round(
      (((oldPrice || product.oldPrice) - (price || product.price)) /
        (oldPrice || product.oldPrice)) *
        100
    );
    product.discount = discount;
  }
  product.price = price || product.price;
  product.oldPrice = oldPrice || product.oldPrice;
  product.stock = stock || product.stock;
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
  product.isFeatured = isFeatured || product.isFeatured;

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

  const product = await Product.findById(id);

  if (!product) {
    throw new APIError("Product not found. please enter valid ID.", 400);
  }

  const productsIds = [];
  productsIds.push(product.image?.publicId);
  product.images?.forEach((i) => {
    productsIds.push(i?.publicId);
  });

  product.reviews?.forEach((r) => {
    if (r?.images.length > 0) {
      r.images.forEach((img) => {
        productsIds.push(img?.publicId);
      });
    }
  });

  await product
    .deleteOne()
    .then(async () => {
      await Promise.all(
        productsIds.map(async (pId) => {
          await DeleteImageFromCloudinary(pId);
        })
      );
    })
    .catch((err) => {
      throw new APIError(`Product deleting error: ${err}`, 400);
    });

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
