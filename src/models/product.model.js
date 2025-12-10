import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    username: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: String,
    images: Array, // [{ url: String, publicId: String }]
    avatar: String,
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    brand: {
      type: String,
      default: "No Brand",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    image: {
      url: String,
      publicId: String,
    },
    images: {
      type: Array, // [{ url: String, publicId: String }]
      maxlength: 16,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    oldPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    size: [],
    color: [],
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    tags: [],
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    sold: {
      type: Number,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    returned: String,
    shortDesc: String,
    longDesc: String,
    sku: String,
    specifications: {
      type: Array, // [{ label: String, content: String }]
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
const Product = mongoose.model("Product", productSchema);
export default Product;
