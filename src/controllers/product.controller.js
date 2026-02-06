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
import Review from "../models/review.model.js";
import Order from "../models/order.model.js";

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

  const category = await Category.findById(product.category).select(
    "name slug",
  );
  const reviews = await Review.find({ productId: product._id });

  return res.status(200).json({
    success: true,
    message: "Product found.",
    data: {
      product,
      category,
      reviews,
    },
  });
});

const searchProductController = asyncHandler(async (req, res) => {
  const { s, c } = req.query;
  const {
    minPrice = 1,
    maxPrice = 100000,
    ratings = 0,
    allFilters = {},
    sortBy = "bestMatch",
    page = 1,
    limit = 10,
  } = req.body;

  const matchStage = {};
  const orConditions = [];

  if (s) {
    orConditions.push({
      name: {
        $regex: String(s),
        $options: "i",
      },
    });
  }

  if (c) {
    orConditions.push({
      "category_info.slug": {
        $regex: String(c),
        $options: "i",
      },
    });
  }

  if (minPrice !== undefined) {
    matchStage.price = { ...matchStage.price, $gte: minPrice };
  }
  if (maxPrice !== undefined) {
    matchStage.price = { ...matchStage.price, $lte: maxPrice };
  }

  if (ratings > 0) {
    matchStage.ratings = { $gte: ratings };
  }

  if (allFilters && typeof allFilters === "object") {
    Object.entries(allFilters).forEach(([key, values]) => {
      if (values.length === 0) return;

      if (["color", "size", "brand"].includes(key)) {
        matchStage[key] = { $in: values };
      } else {
        matchStage.specifications = {
          $elemMatch: {
            lable: key,
            content: { $in: values },
          },
        };
      }
    });
  }

  const sortStage = {};

  if (sortBy === "LtoH") sortStage.price = 1;
  if (sortBy === "HtoL") sortStage.price = -1;

  const countPipeline = [
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category_info",
        pipeline: [
          {
            $project: { name: 1, slug: 1 },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$category_info",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: orConditions.length > 0 ? { $or: orConditions } : {},
    },
    {
      $match: matchStage,
    },
    {
      $count: "total",
    },
  ];

  const pipeline = [
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category_info",
        pipeline: [
          {
            $project: { name: 1, slug: 1 },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$category_info",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: orConditions.length > 0 ? { $or: orConditions } : {},
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
        numReviews: 1,
      },
    },
  );

  const [countResult] = await Product.aggregate(countPipeline);
  const products = await Product.aggregate(pipeline);
  const totalProducts = countResult?.total || 0;
  const totalPages = Math.ceil(totalProducts / limit);

  const filters = await Product.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category_info",
        pipeline: [{ $project: { filters: 1, slug: 1 } }],
      },
    },
    { $unwind: { path: "$category_info", preserveNullAndEmptyArrays: false } },

    // IMPORTANT: apply category/search filter here
    { $match: orConditions.length ? { $or: orConditions } : {} },

    // apply price/size/rating filter
    { $match: matchStage },

    {
      $unwind: {
        path: "$category_info.filters",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: "$category_info.filters.name",
        values: { $addToSet: "$category_info.filters.values" },
        type: { $first: "$category_info.filters.type" },
      },
    },
    {
      $project: {
        _id: 0,
        name: "$_id",
        values: {
          $reduce: {
            input: "$values",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
        type: 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "Products found.",
    data: products,
    totalPages,
    filters,
  });
});

const topRatedProductsController = asyncHandler(async (req, res) => {
  const products = await Product.find({})
    .sort({ ratings: -1 })
    .limit(5)
    .select(
      "name slug price discountPrice image ratings sold numReviews discount",
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
      "name slug price discountPrice image ratings sold numReviews discount",
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
      "name slug price discountPrice image ratings sold numReviews discount",
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
      "name slug price discountPrice image ratings sold numReviews discount",
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
      "name slug price discountPrice image ratings sold numReviews discount",
    );

  return res.status(200).json({
    success: true,
    message: "Related products fetched successfully.",
    data: products,
  });
});

// creating product review when user purchased the product....
const createProductReviewController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { message, rating, orderId } = req.body;
  const files = req.files || [];

  if (!productId || !orderId) {
    throw new APIError("Product Id and Order Id is required.", 404);
  }

  if (!message || !rating) {
    throw new APIError("Product message and Ratings is required.", 404);
  }

  const product = await Product.findById(productId);

  const user = await User.findById(req.user?._id);

  const isValidOrder = await Order.findOne({
    _id: orderId,
    user: user._id,
    "items.product": productId,
    orderStatus: "delivered",
  });

  if (!isValidOrder) {
    throw new APIError(
      "You can not review this product before purchasing it.",
      400,
    );
  }

  const alreadyReviewed = await Review.findOne({
    userId: user._id,
    orderId,
    productId,
  });

  if (alreadyReviewed) {
    throw new APIError("Product already reviewed", 400);
  }

  const review = {
    username: user.name,
    avatar: user.avatar,
    message,
    rating: Number(rating),
    userId: user._id,
    productId: product._id,
    orderId,
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
      }),
    );
  }

  await Review.create(review);

  product.numReviews = product.numReviews + 1;

  let sumOfRatings = 0;
  const reviews = await Review.find({ productId: product._id });
  reviews.forEach((r) => {
    sumOfRatings += r.rating;
  });

  product.ratings =
    product.numReviews === 0 ? 0 : sumOfRatings / product.numReviews;

  await product.save();

  const reviewedItem = isValidOrder.items.find((i) => i.product == productId);
  reviewedItem.isReviewed = true;

  await isValidOrder.save();

  return res.status(200).json({
    success: true,
    message: "Product review added successfully.",
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
    }),
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
        100,
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
      }),
    );
  }

  if (imgsIdsToDelete?.length > 0) {
    const newImages = product.images?.filter(
      (i) => !imgsIdsToDelete.includes(i.publicId),
    );

    await Promise.all(
      imgsIdsToDelete.map(async (pId) => {
        await DeleteImageFromCloudinary(pId);
      }),
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
        }),
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

  // admin controllers
  createProductAdminController,
  productsAdminController,
  singleProductAdminController,
  updateProductAdminController,
  deleteProductAdminController,
};
