import PaymentSetting from "../models/paymentSetting.model.js";
import { asyncHandler } from "../utils/trycatch.js";

const getPaymentController = asyncHandler(async (req, res) => {
  const payment = await PaymentSetting.findOne().select("paymentMethods");

  const data = Object.entries(payment?.paymentMethods)
    .filter((pay) => pay[1].enabled)
    ?.map((pay) => ({ name: pay[1].name, icon: pay[1].icon }));

  return res.status(200).json({
    success: true,
    message: "Payments found",
    data,
  });
});

// admin controllers......................
// get payments / admin
const getPaymentAdminController = asyncHandler(async (req, res) => {
  const payment = await PaymentSetting.findOne();

  if (!payment) {
    await PaymentSetting.create({
      "paymentMethods.stripe.publicKey": process.env.STRIPE_PUBLIC_KEY,
      "paymentMethods.stripe.secretKey": process.env.STRIPE_SECRET_KEY,
      "paymentMethods.stripe.webhookSecret": process.env.STRIPE_WEBHOOK_SECRET,
      "paymentMethods.paypal.clientId": process.env.PAYPAL_CLIENT_ID,
      "paymentMethods.paypal.clientSecret": process.env.PAYPAL_CLIENT_SECRET,
      "paymentMethods.razorpay.keyId": process.env.RAZORPAY_KEY_ID,
      "paymentMethods.razorpay.keySecret": process.env.PAZORPAY_KEY_SECRET,
      "paymentMethods.cod.icon":"/icons/cod.svg",
      "paymentMethods.stripe.icon":"/icons/stripe.svg",
      "paymentMethods.paypal.icon":"/icons/paypal.svg",
      "paymentMethods.razorpay.icon":"/icons/razorpay.svg",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Payment found",
    data: payment,
  });
});

// update payments / admin
const updatePaymentAdminController = asyncHandler(async (req, res) => {
  const {
    codEnabled,
    stripeEnabled,
    paypalEnabled,
    paypalMode,
    razorpayEnabled,
    refundPolicyEnabled,
    refundDays,
    minimumOrderAmount,
  } = req.body;

  const payment = await PaymentSetting.findOne();

  if (codEnabled !== undefined) payment.paymentMethods.cod.enabled = codEnabled;

  if (stripeEnabled !== undefined) {
    payment.paymentMethods.stripe.enabled = stripeEnabled;
  }

  if (paypalEnabled !== undefined) {
    payment.paymentMethods.paypal.enabled = paypalEnabled;
  }
  if (["sandbox", "live"].includes(paypalMode)) {
    payment.paymentMethods.paypal.mode = paypalMode;
  }

  if (razorpayEnabled !== undefined) {
    payment.paymentMethods.razorpay.enabled = razorpayEnabled;
  }

  if (refundPolicyEnabled !== undefined) {
    payment.refundPolicy.enabled = refundPolicyEnabled;
  }
  if (refundDays) payment.refundPolicy.refundDays = refundDays;

  if (minimumOrderAmount) {
    payment.minimumOrderAmount == minimumOrderAmount;
  }

  payment.save();

  return res.status(200).json({
    success: true,
    message: "Payment Setting updated successfully",
  });
});

export {
  getPaymentAdminController,
  updatePaymentAdminController,
  getPaymentController,
};
