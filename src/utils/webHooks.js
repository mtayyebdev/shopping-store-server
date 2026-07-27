import Order from "../models/order.model.js";
import { stripe } from "./stripe.js";
import { APIError } from "./apiError.js";

export const handleStripeWebHook = async (req, res) => {
  let event;
  const signature = req.headers["stripe-signature"];

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    throw new APIError("Payment faild", 400);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const orderId = session.metadata.orderId;

    const order = await Order.findOne({ orderId });

    if (!order) {
      throw new APIError("Order not found for payment", 400);
    }

    order.paymentMethod = "stripe";
    order.paymentStatus = "paid";
    order.paymentResult.transactionId = session.payment_intent;
    order.paymentResult.status = "paid";
    order.paymentResult.update_time = new Date();
    order.paymentResult.gateway = "stripe";
    order.paymentResult.id = session.id;
    order.paymentResult.email_address = session.customer_email;

    await order.save();
  }

  return res.status(200).json({
    received: true,
  });
};