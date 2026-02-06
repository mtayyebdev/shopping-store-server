import Return from "../models/return.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";
import { UploadToCloudinary } from "../utils/uploadFile.js";

// create return
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
    productName
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

  const returnOrder = await Return.create({
    description,
    quantity: quantity ? Number(quantity) : 1,
    orderId,
    reason,
    userId: req.user?.id,
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

// get returns
const getReturnsController = asyncHandler(async (req, res) => {
  const user = req.user?._id;

  const returns = await Return.find({ userId: user }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Returns found",
    data: returns,
  });
});

// admin controllers
// get returns
const getReturnsAdminController = asyncHandler(async (req, res) => {
  const returns = await Return.find()

  return res.status(200).json({
    success: true,
    message: "Returns found",
    data: returns,
  });
});

// update return
const updateReturnStatusAdminController = asyncHandler(async (req, res) => {
  const { returnId } = req.params;
  const { returnStatus } = req.body;

  if (!returnId || !returnStatus) {
    throw new APIError("All fields are required", 404);
  }

  const returnOrder = await Return.findByIdAndUpdate(returnId, {
    status: returnStatus,
  });

  if (!returnOrder) {
    throw new APIError("Something went wrong", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Return status updated",
  });
});

export {
  createReturnController,
  getReturnsController,

  // admin
  getReturnsAdminController,
  updateReturnStatusAdminController,
};
