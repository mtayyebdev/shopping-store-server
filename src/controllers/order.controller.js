import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Review from "../models/review.model.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";
import { sendEmail } from "../utils/sendEmail.js";

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

  const order = await Order.create({
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

  order.orderId = order?._id.toString().toUpperCase();

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
  } = req.body;

  if (!productId || !quantity) {
    throw new APIError("Product not found.", 404);
  }
  if (!shippingAddress) {
    throw new APIError("Please enter shipping address.", 400);
  }

  const product = await Product.findById(productId).select("-images");

  const order = await Order.create({
    shippingPrice: product.shippingPrice,
    totalPrice,
    taxPrice,
    itemsPrice: product.price,
    user: null,
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

  order.orderId = order._id.toString().toUpperCase();
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
  const orders = await Order.find({ user: req.user._id })
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
    $and: [{ user: req.user._id }, { orderId: id }],
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
      404,
    );
  }

  const order = await Order.findOne({ orderId: id, user: req.user._id });
  // const order = await Order.findOne({ orderId: id });

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
      order.paidAt = new Date().toLocaleString();
      order.paymentStatus = "paid";
    }
    order.deliveredAt = new Date().toLocaleString();
    order.orderStatus = "delivered";
  } else {
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
  createDirectOrderController,
};
