import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    productName: String,
    reason: {
      type: String,
      enum: [
        "damaged",
        "wrong_item",
        "wrong_size",
        "not_as_described",
        "other",
        "change_mind",
        "wrong_color",

      ],
      required: true,
    },

    description: String,

    images: Array, // [{ url: String, publicId: String }]

    status: {
      type: String,
      enum: [
        "requested",
        "approved",
        "rejected",
        "picked",
        "received",
        "refunded",
        "replaced",
        "completed"
      ],
      default: "requested",
    },

    refundAmount: Number,

    refundMethod: {
      type: String,
      enum: ["wallet", "bank", "original"],
    },

    adminNote: String,
  },
  { timestamps: true },
);

const Return = mongoose.model("Return", returnSchema);
export default Return;
