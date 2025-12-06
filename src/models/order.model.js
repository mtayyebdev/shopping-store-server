import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    shippingAddress: {
      username: String,
      phone: String,
      address: String,
      city: String,
      region: String,
      district: String,
      landmark: String,
      shipTo: String,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
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
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["strip", "paypal", "cod", "jazzcash", "easypaisa"],
      default: "cod",
    },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },
    itemsPrice: Number,
    shippingPrice: Number,
    taxPrice: Number,
    totalPrice: Number,
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", orderSchema);
export default Order;
