import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    discountPrice: Number,
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
  },
  { timestamps: true }
);
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
