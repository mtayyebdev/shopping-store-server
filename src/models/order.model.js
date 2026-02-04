import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    shippingAddress: {
      username: String,
      phone: String,
      email: String,
      address: String,
      city: String,
      region: String,
      district: String,
      landmark: String,
      shipTo: String,
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      default: "pending",
    },
    orderId: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        color: String,
        size: String,
        isReviewed: {
          type: Boolean,
          default: false,
        },
      },
      { _id: false },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "cod", "jazzcash", "easypaisa"],
      required: false,
    },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    itemsPrice: Number,
    shippingPrice: Number,
    taxPrice: Number,
    totalPrice: Number,
    paidAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true },
);
const Order = mongoose.model("Order", orderSchema);
export default Order;
