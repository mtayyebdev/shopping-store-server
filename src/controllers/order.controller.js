import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";

const createOrderController = asyncHandler(async (req, res) => {
  const {
    cartsIds,
    addressId,
    shippingAddress,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  } = req.body;

  if (!cartsIds || cartsIds.length === 0) {
    throw new APIError("Please buy some products to create your order.", 404);
  }

  if (!addressId && !shippingAddress) {
    throw new APIError("Please select shipping address.");
  }

  const order = await Order.create({
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    user: req.user._id,
  });

  const userCarts = await Cart.find({ user: req.user._id });

  const selectedCarts = userCarts.filter((c) =>
    cartsIds.includes(c._id.toString())
  );

  let productsIds = [];
  await Promise.all(
    selectedCarts.map((c) => {
      order.items.push({
        product: c.item.product,
        name: c.item.name,
        price: c.item.price,
        quantity: c.item.quantity,
        image: c.item.image,
      });
      productsIds.push({
        pId: c.item.product.toString(),
        sold: Number(c.item.quantity),
      });
    })
  );

  if (addressId) {
    const user = await User.findById(req.user._id);
    const userAddress = user?.addresses?.find(
      (a) => a._id.toString() === addressId
    );

    if (!userAddress) {
      throw new APIError("Billing address not found.", 404);
    }

    order.shippingAddress.address = userAddress.address;
    order.shippingAddress.phone = userAddress.phone;
    order.shippingAddress.username = userAddress.name;
    order.shippingAddress.city = userAddress.city;
    order.shippingAddress.region = userAddress.region;
    order.shippingAddress.district = userAddress.district;
    order.shippingAddress.landmark = userAddress.landmark;
    order.shippingAddress.shipTo = userAddress.shipTo;
  } else if (shippingAddress) {
    order.shippingAddress.address = shippingAddress?.address;
    order.shippingAddress.phone = shippingAddress?.phone;
    order.shippingAddress.username = shippingAddress?.username;
    order.shippingAddress.city = shippingAddress?.city;
    order.shippingAddress.region = shippingAddress?.region;
    order.shippingAddress.district = shippingAddress?.district;
    order.shippingAddress.landmark = shippingAddress?.landmark;
    order.shippingAddress.shipTo = shippingAddress?.shipTo;
  }

  order.orderId = order?._id.toString().toUpperCase();

  await order.save();

  await Promise.all(
    productsIds.map(async (p) => {
      const product = await Product.findById(p.pId);
      product.sold += p.sold;

      await product.save();
    })
  );

  return res.status(200).json({
    success: true,
    message: "Order added successfully.",
    data: order.orderId,
  });
});

const ordersController = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).select(
    "-paymentResult"
  );

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
    $and: [{ user: req.user._id }, { orderId: id }],
  }).select("-paymentResult");

  if (!order) {
    throw new APIError("Order not found.", 404);
  }

  return res.status(200).json({
    success: true,
    message: "Order found.",
    data: order,
  });
});

const cancelOrderController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Order Id not found.", 404);
  }

  const order = await Order.findOne({ orderId: id, user: req.user._id });

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
      404
    );
  }

  const order = await Order.findOne({ orderId: id, user: req.user._id });

  if (paymentMethod === "cod") {
    order.paymentMethod = paymentMethod;
    order.orderStatus = "processing";
  }

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Payment added successfully.",
  });
});

// admin controllers........................
const ordersAdminController = asyncHandler(async (req, res) => {
  const orders = await Order.find({});

  return res.status(200).json({
    success: true,
    message: "Orders found.",
    data: orders,
    count: orders.length,
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

  const order = await Order.findById(id);

  if (orderStatus === "shipped" && order.orderStatus === "processing") {
    order.orderStatus = "shipped";
  } else if (orderStatus === "delivered" && order.orderStatus === "shipped") {
    if (order.paymentMethod === "cod") {
      order.isDelivered = true;
      order.isPaid = true;
      order.paidAt = new Date().toLocaleString();
      order.deliveredAt = new Date().toLocaleString();
      order.orderStatus = "delivered";
    } else {
      order.isDelivered = true;
      order.deliveredAt = new Date().toLocaleString();
      order.orderStatus = "delivered";
    }
  }else{
    throw new APIError("You cannot update this order status.", 400);
  }

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order status updated successfully.",
  });
});

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
};
