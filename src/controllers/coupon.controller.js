import Coupon from "../models/coupon.model.js";
import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";

const useCouponController = asyncHandler(async (req, res) => {
  const { code, totalAmount } = req.body;

  if (!code) {
    throw new APIError("Coupon code not found.", 404);
  }

  if (totalAmount === 0) {
    throw new APIError(
      "Please select at least 1 Product to apply coupon code.",
      404
    );
  }

  const coupon = await Coupon.findOne({ code });

  if (!coupon) {
    throw new APIError("Invalid coupon code.", 400);
  }

  if (!coupon.isActive) {
    throw new APIError("Invalid coupon code.", 400);
  }

  const currentDate = new Date();

  if (currentDate > coupon.expiresAt) {
    throw new APIError("This coupon code is expired.", 400);
  }

  if (coupon?.usageLimit !== 0) {
    const currentUser = coupon.usedBy.find(
      (c) => c.userId.toString() === req.user._id.toString()
    );

    if (currentUser && currentUser.usedCount >= coupon.usageLimit) {
      throw new APIError("You've already used this coupon code.", 400);
    }
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

  const usageUser = coupon.usedBy.find(
    (c) => c.userId.toString() === req.user._id.toString()
  );

  if (usageUser) {
    usageUser.usedCount += 1;
  } else {
    coupon.usedBy.push({ userId: req.user._id, usedCount: 1 });
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
const createCouponController = asyncHandler(async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxOrderAmount,
    expiresAt,
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
    expiresAt,
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

const couponsController = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({});

  return res.status(200).json({
    success: true,
    message: "Coupons found.",
    data: coupons,
  });
});

const singleCouponController = asyncHandler(async (req, res) => {
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

const updateCouponController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxOrderAmount,
    expiresAt,
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

  coupon.code = code.toUpperCase() || coupon.code;
  coupon.discountType = discountType || coupon.discountType;
  coupon.discountValue = discountValue || coupon.discountValue;
  coupon.minOrderAmount = minOrderAmount || coupon.minOrderAmount;
  coupon.maxOrderAmount = maxOrderAmount || coupon.maxOrderAmount;
  coupon.expiresAt = expiresAt || coupon.expiresAt;
  coupon.isActive = isActive || coupon.isActive;
  coupon.usageLimit = usageLimit || coupon.usageLimit;

  await coupon.save();

  return res.status(200).json({
    success: true,
    message: "Coupon updated successfully.",
  });
});

const deleteCouponController = asyncHandler(async (req, res) => {
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
  couponsController,
  deleteCouponController,
  updateCouponController,
  createCouponController,
  singleCouponController
};
