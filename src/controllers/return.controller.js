import Return from "../models/return.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";
import {
  UploadToCloudinary,
  DeleteImageFromCloudinary,
} from "../utils/uploadFile.js";
import { generateUniqueID } from "../utils/generateID.js";
import { getDateFilter } from "../utils/dateFilter.js";

// public cont
const createReturnController = asyncHandler(async (req, res) => {
  const {
    orderId,
    productId,
    orderItemId,
    quantity,
    reason,
    description,
    refundMethod,
    refundAmount,
    productName,
  } = req.body;
  const files = req.files || [];

  if (
    !orderId ||
    !productId ||
    !orderItemId ||
    !quantity ||
    !reason ||
    !refundMethod
  ) {
    throw new APIError("All fields are required", 404);
  }

  const returnExists = await Return.findOne({
    orderId,
    userId: req.user?._id,
    orderItemId,
  });

  if (returnExists) {
    throw new APIError("Return already created. please wait for approvel", 400);
  }

  const order = await Order.findOne({
    _id: orderId,
    actionStatus: "active",
    "items._id": orderItemId,
    orderStatus: "delivered",
    paymentStatus: "paid",
  });

  if (!order) {
    throw new APIError("Invalid order", 400);
  }

  const deliveredDays = Math.floor(
    (Date.now() - new Date(order.deliveredAt)) / (1000 * 60 * 60 * 24),
  );

  const isReturnAllowed = await Product.findById(productId);
  if (deliveredDays > isReturnAllowed.returned) {
    throw new APIError("Return window closed", 400);
  }

  const filesData = [];
  if (files?.length > 0) {
    await Promise.all(
      files?.map(async (file) => {
        const uploadedFile = await UploadToCloudinary(file.path, "Return");
        filesData.push({
          url: uploadedFile.secure_url,
          publicId: uploadedFile.public_id,
        });
      }),
    );
  }

  let exists = true;
  let returnId;

  while (exists) {
    returnId = generateUniqueID("RET", 12);
    exists = await Return.findOne({ returnId });
  }

  const returnOrder = await Return.create({
    returnId,
    description,
    quantity: quantity ? Number(quantity) : 1,
    orderId,
    reason,
    userId: req.user?._id,
    images: filesData,
    productId,
    orderItemId,
    productName,
    refundMethod,
    refundAmount: refundAmount ? Number(refundAmount) : 0,
  });

  if (!returnOrder) {
    throw new APIError("Something went wrong", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Return created",
  });
});

const getReturnsController = asyncHandler(async (req, res) => {
  const user = req.user?._id;

  const returns = await Return.aggregate([
    {
      $match: {
        userId: user,
        actionStatus: "active",
      },
    },
    {
      $lookup: {
        from: "orders",
        foreignField: "_id",
        localField: "orderId",
        as: "orderInfo",
        pipeline: [
          {
            $project: {
              orderId: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$orderInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        returnId: 1,
        "orderInfo.orderId": 1,
        images: 1,
        quantity: 1,
        productName: 1,
        reason: 1,
        description: 1,
        status: 1,
        refundAmount: 1,
        refundMethod: 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "Returns found",
    data: returns,
  });
});

// admin controllers
const getReturnsAdminController = asyncHandler(async (req, res) => {
  const {
    search = "",
    time = "all",
    reason = "all",
    status = "all",
    actionStatus = "all",
  } = req.query;
  const page = parseInt(req.query?.page) || 1;
  const limit = parseInt(req.query?.limit) || 1;

  const skip = (page - 1) * limit;

  const filters = {};

  if (time) {
    Object.assign(filters, getDateFilter(time));
  }

  if (reason) {
    filters.reason =
      reason === "all"
        ? {
            $in: [
              "damaged",
              "wrong_item",
              "wrong_size",
              "not_as_described",
              "other",
              "change_mind",
              "wrong_color",
            ],
          }
        : reason;
  }

  if (status) {
    filters.status =
      status === "all"
        ? {
            $in: [
              "requested",
              "approved",
              "rejected",
              "picked",
              "received",
              "refunded",
              "replaced",
              "completed",
            ],
          }
        : status;
  }

  if (actionStatus) {
    filters.actionStatus =
      actionStatus === "all"
        ? {
            $in: ["active", "suspended", "deleted"],
          }
        : actionStatus;
  }

  if (search) {
    filters.$or = [
      { returnId: { $regex: search, $options: "i" } },
      { productName: { $regex: search, $options: "i" } },
    ];
  }

  const returns = await Return.aggregate([
    {
      $match: filters,
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "orders",
        foreignField: "_id",
        localField: "orderId",
        as: "orders_info",
        pipeline: [
          {
            $project: {
              orderId: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: "$orders_info", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "userId",
        as: "users_info",
        pipeline: [
          {
            $project: {
              name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: "$users_info", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        returnId: 1,
        orderId: 1,
        quantity: 1,
        productName: 1,
        "users_info.name": 1,
        "orders_info.orderId": 1,
        reason: 1,
        status: 1,
        actionStatus: 1,
        refundAmount: 1,
        refundMethod: 1,
      },
    },
  ]);

  const totalReturns = await Return.countDocuments({
    ...filters,
  });

  const returnsStats = await Return.aggregate([
    {
      $facet: {
        totalReturns: [
          {
            $match: { actionStatus: "active" },
          },
          { $count: "count" },
        ],
        pendingReturns: [
          {
            $match: {
              status: { $in: ["requested", "approved", "picked", "received"] },
              actionStatus: "active",
            },
          },
          { $count: "count" },
        ],
        completedReturns: [
          {
            $match: {
              status: { $in: ["completed", "refunded", "replaced"] },
              actionStatus: "active",
            },
          },
          { $count: "count" },
        ],
        rejectedReturns: [
          {
            $match: {
              status: { $in: ["rejected"] },
              actionStatus: "active",
            },
          },
          { $count: "count" },
        ],
      },
    },
    {
      $project: {
        totalReturns: {
          $ifNull: [{ $arrayElemAt: ["$totalReturns.count", 0] }, 0],
        },
        pendingReturns: {
          $ifNull: [{ $arrayElemAt: ["$pendingReturns.count", 0] }, 0],
        },
        completedReturns: {
          $ifNull: [{ $arrayElemAt: ["$completedReturns.count", 0] }, 0],
        },
        rejectedReturns: {
          $ifNull: [{ $arrayElemAt: ["$rejectedReturns.count", 0] }, 0],
        },
      },
    },
  ]);

  const totalPages = Math.ceil(totalReturns / limit);

  return res.status(200).json({
    success: true,
    message: "Returns found",
    data: returns,
    totalPages,
    totalReturns,
    stats: returnsStats[0],
  });
});

const updateReturnStatusAdminController = asyncHandler(async (req, res) => {
  const { returnId } = req.params;
  const { returnStatus } = req.body;

  if (!returnId || !returnStatus) {
    throw new APIError("All fields are required", 404);
  }

  const returnFlow = {
    requested: ["approved", "rejected"],
    rejected: [],
    approved: ["picked"],
    picked: ["received"],
    received: ["refunded", "replaced"],
    refunded: ["completed"],
    replaced: ["completed"],
    completed: [],
  };

  const returnOrder = await Return.findById(returnId);

  if (!returnOrder) {
    throw new APIError("Something went wrong", 400);
  }

  if (!returnFlow[returnOrder.status]?.includes(returnStatus)) {
    throw new APIError("Invalid status change", 400);
  }

  returnOrder.status = returnStatus;

  await returnOrder.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Return Status Updated",
  });
});

const getReturnAdminController = asyncHandler(async (req, res) => {
  const { returnId } = req.params;

  if (!returnId) {
    throw new APIError("Return ID not found", 404);
  }

  const resturnData =
    await Return.findById(returnId).populate("userId orderId");

  if (!resturnData) {
    throw new APIError("Return data not found", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Return data found successfully",
    data: resturnData,
  });
});

const deleteReturnAdminController = asyncHandler(async (req, res) => {
  const { returnId } = req.params;

  if (!returnId) {
    throw new APIError("Return ID not found", 404);
  }

  const returnDoc = await Return.findById(returnId);

  if (returnDoc?.images?.length > 0) {
    const returnImgsIds = returnDoc.images?.map((img) => img?.publicId);
    await Promise.all(
      returnImgsIds?.map(async (id) => await DeleteImageFromCloudinary(id)),
    )
      .then(async (res) => {
        await returnDoc.deleteOne();

        return res.status(200).json({
          success: true,
          message: "Return deleted successfully",
        });
      })
      .catch((err) => {
        throw new APIError("Something went wrong", 500);
      });
  } else {
    await returnDoc.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Return deleted successfully",
    });
  }
});

const updateReturnActionStatusAdminController = asyncHandler(
  async (req, res) => {
    const { returnId } = req.params;
    const { actionStatus } = req.body;

    if (!returnId) {
      throw new APIError("Return Id not found.", 404);
    }

    if (!["active", "suspended", "deleted"]?.includes(actionStatus)) {
      throw new APIError("Invalid Action Status", 400);
    }

    const returnUpdated = await Return.findByIdAndUpdate(returnId, {
      actionStatus,
    });

    if (!returnUpdated) {
      throw new APIError("Something went wrong", 400);
    }

    return res.status(200).json({
      success: true,
      message: "Action Status updated successfully",
    });
  },
);

export {
  createReturnController,
  getReturnsController,

  // admin
  getReturnsAdminController,
  updateReturnStatusAdminController,
  getReturnAdminController,
  deleteReturnAdminController,
  updateReturnActionStatusAdminController,
};
