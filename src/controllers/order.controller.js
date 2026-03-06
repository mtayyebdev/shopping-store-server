import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Review from "../models/review.model.js";
import DeliveryBoy from "../models/delivery_boy.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";
import { sendEmail } from "../utils/sendEmail.js";
import { getDateFilter } from "../utils/dateFilter.js";
import { generateUniqueID } from "../utils/generateID.js";

const createOrderController = asyncHandler(async (req, res) => {
  const {
    cartsIds,
    shippingAddress,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  } = req.body;

  if (!cartsIds || cartsIds.length === 0) {
    throw new APIError("Please buy some products to create your order.", 404);
  }

  if (!shippingAddress) {
    throw new APIError("Please enter shipping address.");
  }

  let exists = true;
  let orderId;
  while (exists) {
    orderId = generateUniqueID("ORD", 12);
    exists = await Order.findOne({ orderId });
  }

  const order = await Order.create({
    orderId,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    user: req.user._id,
  });

  const userCarts = await Cart.find({
    _id: { $in: cartsIds },
    user: req.user._id,
  });

  let productsIds = [];
  await Promise.all(
    userCarts.map((c) => {
      order.items.push({
        product: c.item.product,
        name: c.item.name,
        price: c.item.price,
        quantity: c.item.quantity,
        image: c.item.image,
        color: c.item.color,
        size: c.item.size,
      });
      productsIds.push({
        pId: c.item.product.toString(),
        sold: Number(c.item.quantity),
      });
    }),
  );

  order.shippingAddress.address = shippingAddress?.address;
  order.shippingAddress.phone = shippingAddress?.phone;
  order.shippingAddress.username = shippingAddress?.name;
  order.shippingAddress.city = shippingAddress?.city;
  order.shippingAddress.region = shippingAddress?.region;
  order.shippingAddress.district = shippingAddress?.district;
  order.shippingAddress.landmark = shippingAddress?.landmark;
  order.shippingAddress.shipTo = shippingAddress?.shipTo;

  await order.save();

  await Promise.all(
    productsIds.map(async (p) => {
      const product = await Product.findById(p.pId);
      product.sold += p.sold;

      await product.save();
    }),
  );

  return res.status(200).json({
    success: true,
    message: "Order placed successfully.",
    data: order.orderId,
  });
});

const createDirectOrderController = asyncHandler(async (req, res) => {
  const {
    productId,
    quantity,
    size,
    color,
    shippingAddress,
    totalPrice,
    taxPrice,
    questEmail,
    guestName,
  } = req.body;

  if (!productId || !quantity) {
    throw new APIError("Product not found.", 404);
  }
  if (!shippingAddress) {
    throw new APIError("Please enter shipping address.", 400);
  }

  if (!guestName || !questEmail) {
    throw new APIError("Please enter name and email.", 400);
  }

  const product = await Product.findById(productId).select("-images");

  const order = await Order.create({
    shippingPrice: product.shippingPrice,
    totalPrice,
    taxPrice,
    itemsPrice: product.price,
    user: null,
    questEmail,
    guestName,
  });

  order.shippingAddress.address = shippingAddress?.address;
  order.shippingAddress.phone = shippingAddress?.phone;
  order.shippingAddress.username = shippingAddress?.name;
  order.shippingAddress.city = shippingAddress?.city;
  order.shippingAddress.region = shippingAddress?.region;
  order.shippingAddress.district = shippingAddress?.district;
  order.shippingAddress.landmark = shippingAddress?.landmark;
  order.shippingAddress.shipTo = shippingAddress?.shipTo;
  order.shippingAddress.email = shippingAddress?.email;

  order.items.push({
    product: product._id,
    name: product.name,
    price: product.price,
    quantity,
    image: product.image.url,
    color,
    size,
  });

  let exists = true;
  let orderId;
  while (exists) {
    orderId = generateUniqueID("ORD", 12);
    exists = await Order.findById(orderId);
  }

  order.orderId = orderId;
  product.sold = product.sold + quantity;

  await order.save();
  await product.save();

  // await sendEmail({
  //   to: order.shippingAddress?.email,
  //   subject: ` Order Confirmation - ${order.orderId} `,
  //   html: `<h1> Thank you for your order! </h1>
  //   <p> Your order with Order ID: <strong> ${order.orderId} </strong> has been successfully placed. We will notify you once it is shipped. </p>
  //   <h3> Shipping Address: </h3>
  //   <p> ${order.shippingAddress?.username} <br/>
  //   ${order.shippingAddress?.address} <br/>
  //   ${order.shippingAddress?.city}, ${order.shippingAddress?.region} <br/>
  //   ${order.shippingAddress?.district} <br/>
  //   Phone: ${order.shippingAddress?.phone} <br/>
  //   </p>
  //   <h3> Order Details: </h3>
  //   <p> Product Name: ${order.items[0].name} <br/>
  //   Quantity: ${order.items[0].quantity} <br/>
  //   Price: $${order.items[0].price} <br/>
  //   Total Price: $${order.totalPrice} <br/>
  //   </p>
  //   <h4> Please select payment method to deliver your order.</h4>
  //   <p> We appreciate your business! </p>
  //   `,
  // });

  return res.status(200).json({
    success: true,
    message: "Order placed successfully.",
    data: order.orderId,
  });
});

const ordersController = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    user: req.user._id,
    actionStatus: "active",
  })
    .sort({ createdAt: -1 })
    .select("-paymentResult");

  return res.status(200).json({
    success: true,
    message: "Orders found.",
    data: orders,
  });
});

const singleOrderController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Order Id not found.", 404);
  }

  const order = await Order.findOne({
    $and: [{ user: req.user._id }, { orderId: id }, { actionStatus: "active" }],
  });

  if (!order) {
    throw new APIError("Order not found.", 404);
  }

  const reviews = await Review.find({
    userId: req.user?._id,
    orderId: order._id,
  });

  const reviewedProductsIds = reviews.map((r) => r.productId.toString());

  // Add isReviewed flag per item
  const orderItems = order.items.map((item) => ({
    ...item.toObject(), // ensures clean object
    isReviewed: reviewedProductsIds.includes(item.product.toString()),
  }));

  // Prepare final response object
  const orderData = {
    ...order.toObject(),
    items: orderItems,
  };

  return res.status(200).json({
    success: true,
    message: "Order found.",
    data: orderData,
  });
});

const cancelOrderController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Order Id not found.", 404);
  }

  const order = await Order.findOne({
    orderId: id,
    user: req.user._id,
    actionStatus: "active",
  });

  if (order.orderStatus !== "pending") {
    throw new APIError("You cannot cancel this order.", 400);
  }

  order.orderStatus = "cancelled";

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order cancelled successfully.",
  });
});

const updateOrderPaymentController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentMethod } = req.body;

  if (!id) {
    throw new APIError("Order Id not found.", 404);
  }

  if (paymentMethod !== "cod") {
    throw new APIError(
      "Please select payment method Cash on Delivery, Other payment methods are coming soon.",
      404,
    );
  }

  const order = await Order.findOne({
    orderId: id,
    user: req.user._id,
    actionStatus: "active",
  });

  if (paymentMethod === "cod") {
    order.paymentMethod = paymentMethod;
  }

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Payment added successfully.",
  });
});

// admin controllers........................
const ordersAdminController = asyncHandler(async (req, res) => {
  const {
    status = "all",
    time = "all",
    search = "",
    paymentStatus = "all",
    actionStatus = "all",
  } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (status) {
    filter.orderStatus =
      status === "all"
        ? {
            $in: [
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
          }
        : status;
  }

  if (time) {
    Object.assign(filter, getDateFilter(time));
  }

  if (paymentStatus) {
    filter.paymentStatus =
      paymentStatus === "all"
        ? { $in: ["pending", "paid", "failed", "refunded"] }
        : paymentStatus;
  }

  if (actionStatus) {
    filter.actionStatus =
      actionStatus === "all"
        ? { $in: ["active", "suspended", "deleted"] }
        : actionStatus;
  }

  const orders = await Order.aggregate([
    {
      $match: {
        orderId: { $regex: search, $options: "i" },
        ...filter,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        orderId: 1,
        "items.length": 1,
        totalPrice: 1,
        orderStatus: 1,
        createdAt: 1,
        "user.name": 1,
        "user.email": 1,
        guestEmail: 1,
        guestName: 1,
        paymentMethod: 1,
        paymentStatus: 1,
        actionStatus: 1,
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const ordersStats = await Order.aggregate([
    {
      $facet: {
        totalOrders: [
          { $match: { actionStatus: "active" } },
          { $count: "count" },
        ],
        InProgressOrders: [
          {
            $match: {
              orderStatus: {
                $in: ["pending", "confirmed", "processing", "shipped"],
              },
              actionStatus: "active",
            },
          },
          { $count: "count" },
        ],
        DeliveredOrders: [
          {
            $match: {
              orderStatus: "delivered",
              actionStatus: "active",
            },
          },
          { $count: "count" },
        ],
        paidRevenue: [
          {
            $match: {
              paymentStatus: "paid",
              actionStatus: "active",
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalPrice" },
            },
          },
        ],
      },
    },
    {
      $project: {
        totalOrders: {
          $ifNull: [{ $arrayElemAt: ["$totalOrders.count", 0] }, 0],
        },
        InProgressOrders: {
          $ifNull: [{ $arrayElemAt: ["$InProgressOrders.count", 0] }, 0],
        },
        DeliveredOrders: {
          $ifNull: [{ $arrayElemAt: ["$DeliveredOrders.count", 0] }, 0],
        },
        paidRevenue: {
          $ifNull: [{ $arrayElemAt: ["$paidRevenue.totalRevenue", 0] }, 0],
        },
      },
    },
  ]);

  const totalOrders = await Order.countDocuments({
    orderId: { $regex: search, $options: "i" },
    ...filter,
  });

  const totalPages = Math.ceil(totalOrders / limit);

  return res.status(200).json({
    success: true,
    message: "Orders found.",
    data: orders,
    stats: ordersStats[0],
    totalOrders,
    totalPages,
  });
});

const singleOrderAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Order Id not found.", 404);
  }

  const order = await Order.findById(id);

  if (!order) {
    throw new APIError("Order not found.", 404);
  }

  return res.status(200).json({
    success: true,
    message: "Order found.",
    data: order,
  });
});

const deleteOrderAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Order Id not found.", 404);
  }

  await Order.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Order deleted successfully.",
  });
});

const updateOrderStatusAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  if (!id) {
    throw new APIError("Order Id not found.", 404);
  }

  if (!orderStatus) {
    throw new APIError("Order status not found.", 404);
  }

  const orderFlow = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing"],
    processing: ["shipped"],
    shipped: ["out_for_delivery"],
    out_for_delivery: ["delivered"],
    delivered: ["returned"],
    returned: ["refunded"],
  };

  const order = await Order.findById(id);

  if (!orderFlow[order.orderStatus]?.includes(orderStatus)) {
    throw new APIError("Invalid status change.", 400);
  }

  if (orderStatus === "delivered" && order.orderStatus === "out_for_delivery") {
    if (order.paymentMethod === "cod") {
      order.paidAt = new Date().toLocaleString();
      order.paymentStatus = "paid";
      order.orderStatus = "delivered";
      order.deliveredAt = new Date().toLocaleString();
    } else if (order.paymentStatus !== "paid") {
      throw new APIError("Order Payment not completed", 400);
    }
  } else if (orderStatus === "cancelled") {
    order.cancelledAt = new Date().toLocaleString();
  } else if (orderStatus === "returned") {
    order.returnedAt = new Date().toLocaleString();
  } else if (orderStatus === "refunded") {
    order.paymentStatus = "refunded";
  } else if (orderStatus === "confirmed" && !order?.paymentMethod) {
    throw new APIError("Payment Method not added.");
  }

  order.orderStatus = orderStatus;

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order status updated successfully.",
  });
});

const updateOrderActionStatusAdminController = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { actionStatus } = req.body;

    if (!id) {
      throw new APIError("Order Id not found.", 404);
    }

    if (!["active", "suspended", "deleted"].includes(actionStatus)) {
      throw new APIError("Action status not found.", 404);
    }

    const order = await Order.findById(id);

    order.actionStatus = actionStatus;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order action status updated successfully.",
    });
  },
);

const assignOrderToDeliveryBoyAdminController = asyncHandler(
  async (req, res) => {
    const { orderId } = req.params;
    const { deliveryBoyId } = req.body;

    if (!orderId || !deliveryBoyId) {
      throw new APIError("Ids not found", 404);
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

    if (!deliveryBoy) {
      throw new APIError("Delivery boy not found", 400);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new APIError("Order not found", 400);
    }

    order.deliveryBoy = deliveryBoy._id;
    deliveryBoy.currentOrders += 1;

    await order.save();
    await deliveryBoy.save();

    return res.status(200).json({
      success: true,
      message: "Order assigned successfully",
    });
  },
);

export {
  createOrderController,
  ordersAdminController,
  ordersController,
  singleOrderAdminController,
  singleOrderController,
  deleteOrderAdminController,
  cancelOrderController,
  updateOrderStatusAdminController,
  updateOrderPaymentController,
  createDirectOrderController,
  updateOrderActionStatusAdminController,
  assignOrderToDeliveryBoyAdminController,
};
