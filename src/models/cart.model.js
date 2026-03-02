import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    price: Number,
    oldPrice: Number,
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    image: String,
    brand: String,
    color: String,
    size: String,
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    item: cartItemSchema,
    totalPrice: {
      type: Number,
      default: 0,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    },
  },
  { timestamps: true },
);

cartSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
