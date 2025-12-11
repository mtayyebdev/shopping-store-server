import Coupon from "../models/coupon.model.js";
import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";
import * as z from "zod";

const useCouponController = asyncHandler(async (req, res) => {
  const { code, totalAmount } = req.body;

  const validate = z.object({
    code: z.string().min(1, "Coupon code is required."),
    totalAmount: z
      .number("Total amount must be a number.")
      .min(0.01, "Total amount must be greater than 0."),
  });

  const parsedData = validate.safeParse({ code, totalAmount });

  if (!parsedData.success) {
    const error = parsedData.error.issues[0].message;
    throw new APIError(error, 400);
  }

  const coupon = await Coupon.findOne({
    code: code?.toUpperCase(),
    isActive: true,
  });

  if (!coupon) {
    throw new APIError("Invalid coupon code.", 400);
  }

  const currentDate = new Date();

  if (currentDate > coupon.expiresAt) {
    throw new APIError("This coupon code is expired.", 400);
  }

  if (coupon.minOrderAmount > Number(totalAmount)) {
    throw new APIError(
      `Sorry, this coupon requires a minimum order of ${coupon.minOrderAmount}`,
      400
    );
  }

  if (coupon?.maxOrderAmount < Number(totalAmount)) {
    throw new APIError(
      `This coupon is valid only for orders of ${coupon.maxOrderAmount} or less.`,
      400
    );
  }

  if (req.user?._id) {
    if (coupon?.usageLimit !== 0) {
      const currentUser = coupon.usedBy.find(
        (c) => c.userId.toString() === req.user._id.toString()
      );

      if (currentUser && currentUser.usedCount >= coupon.usageLimit) {
        throw new APIError("You've already used this coupon code.", 400);
      }
    }

    const usageUser = coupon.usedBy.find(
      (c) => c.userId.toString() === req.user._id.toString()
    );

    if (usageUser) {
      usageUser.usedCount += 1;
    } else {
      coupon.usedBy.push({ userId: req.user._id, usedCount: 1 });
    }
  }

  await coupon.save();

  return res.status(200).json({
    success: true,
    message: "Coupon code applied successfully.",
    data: {
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
  });
});

// Coupon Admin controllers...................
const createCouponAdminController = asyncHandler(async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxOrderAmount,
    expiresIn,
    isActive,
    usageLimit,
  } = req.body;

  const couponExist = await Coupon.findOne({ code });
  if (couponExist) {
    throw new APIError(
      "Coupon already exist. Please try another coupon code.",
      400
    );
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    isActive,
    minOrderAmount,
    maxOrderAmount,
    expiresAt: expiresIn
      ? new Date(Date.now() + Number(expiresIn) * 24 * 60 * 60 * 1000)
      : "",
    usageLimit,
  });

  if (!coupon) {
    throw new APIError("Coupon not created.", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Coupon created successfully.",
  });
});

const couponsAdminController = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({});

  return res.status(200).json({
    success: true,
    message: "Coupons found.",
    data: coupons,
  });
});

const singleCouponAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Coupon Id not found.", 404);
  }

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new APIError("Coupon not found.", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Coupon found successfully.",
    data: coupon,
  });
});

const updateCouponAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxOrderAmount,
    expiresIn,
    isActive,
    usageLimit,
  } = req.body;

  if (!id) {
    throw new APIError("Coupon ID not found.", 404);
  }

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new APIError("Coupon not found.", 404);
  }

  coupon.code = code?.toUpperCase() || coupon.code;
  coupon.discountType = discountType || coupon.discountType;
  coupon.discountValue = discountValue || coupon.discountValue;
  coupon.minOrderAmount = minOrderAmount || coupon.minOrderAmount;
  coupon.maxOrderAmount = maxOrderAmount || coupon.maxOrderAmount;
  coupon.expiresAt = expiresIn
    ? new Date(Date.now() + Number(expiresIn) * 24 * 60 * 60 * 1000)
    : coupon.expiresAt;
  coupon.isActive = isActive || coupon.isActive;
  coupon.usageLimit = usageLimit || coupon.usageLimit;

  await coupon.save();

  return res.status(200).json({
    success: true,
    message: "Coupon updated successfully.",
  });
});

const deleteCouponAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Coupon ID not found.", 404);
  }

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new APIError("Coupon not found.", 404);
  }

  await coupon.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Coupon deleted successfully.",
  });
});

export {
  useCouponController,
  couponsAdminController,
  deleteCouponAdminController,
  updateCouponAdminController,
  createCouponAdminController,
  singleCouponAdminController,
};
