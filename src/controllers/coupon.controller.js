import Coupon from "../models/coupon.model.js";
import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";
import { getDateFilter } from "../utils/dateFilter.js";
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
    actionStatus: "active",
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
      400,
    );
  }

  if (coupon?.maxOrderAmount < Number(totalAmount)) {
    throw new APIError(
      `This coupon is valid only for orders of ${coupon.maxOrderAmount} or less.`,
      400,
    );
  }

  if (req.user?._id) {
    if (coupon?.usageLimit !== 0) {
      const currentUser = coupon.usedBy.find(
        (c) => c.userId.toString() === req.user._id.toString(),
      );

      if (currentUser && currentUser.usedCount >= coupon.usageLimit) {
        throw new APIError("You've already used this coupon code.", 400);
      }
    }

    const usageUser = coupon.usedBy.find(
      (c) => c.userId.toString() === req.user._id.toString(),
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
      400,
    );
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    actionStatus: isActive ? "active" : "inactive",
    minOrderAmount,
    maxOrderAmount,
    expiresAt: expiresIn,
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
  // filters
  const dateRange = req.query.date || "all";
  const discountType = req.query.discount;
  const status = req.query.status;

  // searching and pagination
  const searchQuery = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let filter = {};
  const now = new Date();

  if (dateRange) {
    Object.assign(filter, getDateFilter(dateRange));
  }

  if (discountType) {
    filter.discountType =
      discountType === "all" ? { $in: ["percentage", "fixed"] } : discountType;
  }

  if (status) {
    switch (status) {
      case "active":
        filter.actionStatus = "active";
        break;
      case "inactive":
        filter.actionStatus = "inactive";
        break;
      case "expired":
        filter.expiresAt = { $lte: now };
        break;
      case "deleted": {
        filter.actionStatus = "deleted";
        break;
      }
      case "all":
      default:
        break;
    }
  }

  const coupons = await Coupon.aggregate([
    {
      $match: {
        code: { $regex: searchQuery, $options: "i" },
        ...filter,
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const totalCoupons = await Coupon.countDocuments({
    code: { $regex: searchQuery, $options: "i" },
    ...filter,
  });

  const couponStats = await Coupon.aggregate([
    {
      $facet: {
        totalCoupons: [{ $count: "total" }],
        activeCoupons: [
          { $match: { actionStatus: "active" } },
          { $count: "total" },
        ],
        expiredCoupons: [
          { $match: { expiresAt: { $lte: now } } },
          { $count: "total" },
        ],
        totalUsage: [
          { $unwind: "$usedBy" },
          { $group: { _id: null, totalUsage: { $sum: "$usedBy.usedCount" } } },
        ],
      },
    },
    {
      $project: {
        totalCoupons: {
          $ifNull: [{ $arrayElemAt: ["$totalCoupons.total", 0] }, 0],
        },
        activeCoupons: {
          $ifNull: [{ $arrayElemAt: ["$activeCoupons.total", 0] }, 0],
        },
        expiredCoupons: {
          $ifNull: [{ $arrayElemAt: ["$expiredCoupons.total", 0] }, 0],
        },
        totalUsage: {
          $ifNull: [{ $arrayElemAt: ["$totalUsage.totalUsage", 0] }, 0],
        },
      },
    },
  ]);

  const totalPages = Math.ceil(totalCoupons / limit);

  return res.status(200).json({
    success: true,
    message: "Coupons found.",
    data: coupons,
    totalPages,
    totalCoupons,
    couponStats: couponStats[0],
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
    usageLimit,
  } = req.body;

  if (!id) {
    throw new APIError("Coupon ID not found.", 404);
  }

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new APIError("Coupon not found.", 404);
  }

  if (expiresIn <= new Date()) {
    throw new APIError("Expiration date must be in the future.", 400);
  }

  coupon.code = code?.toUpperCase() || coupon.code;
  coupon.discountType = discountType || coupon.discountType;
  coupon.discountValue = discountValue || coupon.discountValue;
  coupon.minOrderAmount = minOrderAmount || coupon.minOrderAmount;
  coupon.maxOrderAmount = maxOrderAmount || coupon.maxOrderAmount;
  coupon.expiresAt = expiresIn;
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

const updateCouponStatusAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    throw new APIError("Coupon ID not found.", 404);
  }

  if (!["active", "inactive", "deleted"].includes(status)) {
    throw new APIError("Invalid status value.", 400);
  }

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new APIError("Coupon not found.", 404);
  }

  coupon.actionStatus = status;

  await coupon.save();

  return res.status(200).json({
    success: true,
    message: "Coupon status updated successfully.",
  });
});

export {
  useCouponController,
  couponsAdminController,
  deleteCouponAdminController,
  updateCouponAdminController,
  createCouponAdminController,
  singleCouponAdminController,
  updateCouponStatusAdminController,
};
