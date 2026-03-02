import mongoose from "mongoose";

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
    sold: {
      type: Number,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    returned: Number,
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
    actionStatus: {
      type: String,
      default: "active",
      enum: ["active", "suspended", "deleted"],
    },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);
export default Product;
