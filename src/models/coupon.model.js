import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxOrderAmount: Number,
    expiresAt: {
      type: Date,
      required: true,
    },
    actionStatus: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
    },
    usageLimit: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        usedCount: {
          type: Number,
          default: 1,
        },
      },
      { _id: false },
    ],
  },
  { timestamps: true },
);

couponSchema.index({ code: 1 });
couponSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 10 * 24 * 60 * 60 * 1000 },
); // TTL index to automatically delete expired coupons after 10 days

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
