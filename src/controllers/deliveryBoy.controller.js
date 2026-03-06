import DeliveryBoy from "../models/delivery_boy.js";
import Order from "../models/order.model.js";
import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";

// get assigned orders / delivery boy
const getAssignedOrdersController = asyncHandler(async (req, res) => {
  const { deliveryBoyId } = req.deliveryBoy._id;

  if (!deliveryBoyId) {
    throw new APIError("Delivery boy not found", 404);
  }

  const assignedOrders = await Order.find({
    deliveryBoy: deliveryBoyId,
    actionStatus: "active",
  });

  return res.status(200).json({
    success: true,
    message: "Orders found successfully",
    data: assignedOrders,
  });
});

// update assigned order status / delivery boy
const updateAssignedOrderStatusController = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!orderId) {
    throw new APIError("Order Id not found", 404);
  }

  const rider = await DeliveryBoy.findById(req.deliveryBoy._id);

  if (!rider) {
    throw new APIError("Rider not found", 400);
  }

  const order = await Order.findOne({
    orderId,
    deliveryBoy: req.deliveryBoy._id,
    actionStatus: "active",
  });

  if (!order) {
    throw new APIError("Order not found", 400);
  }

  const orderFlow = {
    confirmed: ["processing"],
    processing: ["shipped"],
    shipped: ["out_for_delivery"],
    out_for_delivery: ["delivered"],
    delivered: ["returned"],
    returned: ["refunded"],
  };

  if (!orderFlow[order.orderStatus]?.includes(status)) {
    throw new APIError("Invalid status change.", 400);
  }

  if (orderStatus === "delivered" && order.orderStatus === "out_for_delivery") {
    if (order.paymentMethod === "cod") {
      order.paidAt = new Date().toLocaleString();
      order.paymentStatus = "paid";
      order.orderStatus = "delivered";
      order.deliveredAt = new Date().toLocaleString();
      rider.currentOrders -= 1;
    } else if (order.paymentStatus !== "paid") {
      throw new APIError("Order Payment not completed", 400);
    }
  } else if (orderStatus === "returned") {
    order.returnedAt = new Date().toLocaleString();
    // rider.currentOrders -= 1;
  } else if (orderStatus === "refunded") {
    order.paymentStatus = "refunded";
    rider.currentOrders -= 1;
  }

  order.orderStatus = orderStatus;

  await order.save();
  await rider.save();

  return res.status(200).json({
    success: true,
    message: "Order status updated successfully.",
  });
});

// login delivery boy
const loginDeliveryBoyController = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    throw new APIError("Phone and Password is required", 404);
  }

  const phoneExist = await DeliveryBoy.findOne({ phone });

  if (!phoneExist) {
    throw new APIError("Account not found", 400);
  }

  const passwordCorrect = await phoneExist.comparePassword(password);

  if (!passwordCorrect) {
    throw new APIError("Invalid Password", 400);
  }

  const token = await phoneExist.generateJWTToken();
  await res.cookie("riderToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
  });

  return res.status(200).json({
    success: true,
    message: "Logined successfully.",
  });
});

// get single delivery boy / delivery boy
const getSingleDeliveryBoyController = asyncHandler(async (req, res) => {
  const deliveryBoyId = req.deliveryBoy._id;

  if (!deliveryBoyId) {
    throw new APIError("ID not found", 404);
  }

  const deliBoy = await DeliveryBoy.findById(deliveryBoyId);

  if (!deliBoy) {
    throw new APIError("Something went wrong", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Delivery boy found successfully",
    data: deliBoy,
  });
});

// admin controllers...........................
// create delivery boy / admin
const createDeliveryBoyAdminController = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    vehicleType,
    vehicleNumber,
    country,
    city,
    state,
    postalCode,
    fullAddress,
  } = req.body;

  const deliBoy = await DeliveryBoy.create({
    name,
    email,
    phone,
    password,
    vehicleType,
    vehicleNumber,
    "location.country": country,
    "location.city": city,
    "location.state": state,
    "location.postalCode": postalCode,
    "location.fullAddress": fullAddress,
  });

  if (!deliBoy) {
    throw new APIError("Something went wrong", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Delivery boy added successfully",
  });
});

// get delivery boys / admin
const getDeliveryBoysAdminController = asyncHandler(async (req, res) => {
  const { actionStatus, search, vehicleType, workload } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;

  const skip = (page - 1) * limit;

  const filters = {};

  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { vehicleNumber: { $regex: search, $options: "i" } },
    ];
  }

  if (actionStatus) {
    filters.actionStatus =
      actionStatus === "all"
        ? { $in: ["active", "suspended", "deleted"] }
        : actionStatus;
  }

  if (vehicleType) {
    filters.vehicleType =
      vehicleType === "all" ? { $in: ["bike", "car", "cycle"] } : vehicleType;
  }

  if (workload !== "all") {
    if (workload === "idle") {
      filters.currentOrders = 0;
    } else if (workload === "normal") {
      filters.currentOrders = {
        $and: [{ currentOrders: { $gt: 0 } }, { currentOrders: { $lte: 3 } }],
      };
    } else if (workload === "busy") {
      filters.currentOrders = { currentOrders: { $gt: 3 } };
    }
  }

  const deliveryBoys = await DeliveryBoy.aggregate([
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
      $project: {
        _id: 1,
        name: 1,
        phone: 1,
        email: 1,
        vehicleType: 1,
        vehicleNumber: 1,
        currentOrders: 1,
        "address.city": 1,
        actionStatus: 1,
      },
    },
  ]);

  const totalDeiveryBoys = await DeliveryBoy.countDocuments({
    ...filters,
  });

  const deliveryBoyStats = await DeliveryBoy.aggregate([
    {
      $facet: {
        totalRiders: [{ $count: "count" }],
        activeRiders: [
          { $match: { actionStatus: "active" } },
          { $count: "count" },
        ],
        busyRiders: [
          { $match: { currentOrders: { $gt: 3 }, actionStatus: "active" } },
          { $count: "count" },
        ],
        suspendedRiders: [
          { $match: { actionStatus: "suspended" } },
          { $count: "count" },
        ],
      },
    },
    {
      $project: {
        totalRiders: {
          $ifNull: [{ $arrayElemAt: ["$totalRiders.count", 0] }, 0],
        },
        activeRiders: {
          $ifNull: [{ $arrayElemAt: ["$activeRiders.count", 0] }, 0],
        },
        busyRiders: {
          $ifNull: [{ $arrayElemAt: ["$busyRiders.count", 0] }, 0],
        },
        suspendedRiders: {
          $ifNull: [{ $arrayElemAt: ["$suspendedRiders.count", 0] }, 0],
        },
      },
    },
  ]);

  const totalPages = Math.ceil(totalDeiveryBoys / limit);

  return res.status(200).json({
    success: true,
    message: "Delivery boys found",
    data: deliveryBoys,
    totalPages,
    totalDeiveryBoys,
    stats: deliveryBoyStats[0],
  });
});

// get single delivery boy / admin
const getSingleDeliveryBoyAdminController = asyncHandler(async (req, res) => {
  const { deliveryBoyId } = req.params;

  if (!deliveryBoyId) {
    throw new APIError("ID not found", 404);
  }

  const deliBoy = await DeliveryBoy.findById(deliveryBoyId);

  if (!deliBoy) {
    throw new APIError("Something went wrong", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Delivery boy found successfully",
    data: deliBoy,
  });
});

// update delivery boy / admin
const updateDeliveryBoyAdminController = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    vehicleType,
    vehicleNumber,
    country,
    city,
    state,
    postalCode,
    fullAddress,
  } = req.body;
  const { riderId } = req.params;

  if (!riderId) {
    throw new APIError("Rider Id not found", 404);
  }

  const rider = await DeliveryBoy.findById(riderId);

  if (name) rider.name = name;
  if (phone) rider.phone = phone;
  if (email) rider.email = email;
  if (password) rider.password = password;
  if (vehicleNumber) rider.vehicleNumber = vehicleNumber;
  if (vehicleType) rider.vehicleType = vehicleType;
  if (country) rider.address.country = country;
  if (city) rider.address.city = city;
  if (state) rider.address.state = state;
  if (postalCode) rider.address.postalCode = postalCode;
  if (fullAddress) rider.address.fullAddress = fullAddress;

  return res.status(200).json({
    success: true,
    message: "Delivery boy data updated",
  });
});

// delete delivery boy / admin
const deleteDeliveryBoyAdminController = asyncHandler(async (req, res) => {
  const { deliveryBoyId } = req.params;

  if (!deliveryBoyId) {
    throw new APIError("ID not found", 404);
  }

  const deliBoy = await DeliveryBoy.findByIdAndDelete(deliveryBoyId);

  if (!deliBoy) {
    throw new APIError("Something went wrong", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Delivery boy deleted successfully",
  });
});

// update action status of delivery boy / admin
const updateActionStatusDeliveryBoyAdminController = asyncHandler(
  async (req, res) => {
    const { deliveryBoyId } = req.params;
    const { actionStatus } = req.body;

    if (!deliveryBoyId) {
      throw new APIError("ID not found", 404);
    }

    if (!["active", "suspended", "deleted"].includes(actionStatus)) {
      throw new APIError("Invalid action status", 400);
    }

    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(deliveryBoyId, {
      actionStatus,
    });

    if (!deliveryBoy) {
      throw new APIError("Something went wrong", 400);
    }

    return res.status(200).json({
      success: true,
      message: "Action Status updated successfully",
    });
  },
);

export {
  createDeliveryBoyAdminController,
  getAssignedOrdersController,
  updateActionStatusDeliveryBoyAdminController,
  deleteDeliveryBoyAdminController,
  getSingleDeliveryBoyAdminController,
  getSingleDeliveryBoyController,
  loginDeliveryBoyController,
  getDeliveryBoysAdminController,
  updateDeliveryBoyAdminController,
  updateAssignedOrderStatusController,
};
