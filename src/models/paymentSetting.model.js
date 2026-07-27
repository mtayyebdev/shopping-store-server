import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    paymentMethods: {
      cod: {
        name:{
          type:String,
          default:"COD"
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        icon:String,
      },

      stripe: {
         name:{
          type:String,
          default:"Stripe"
        },
        enabled: {
          type: Boolean,
          default: false,
        },
        icon:String,
        publicKey: String,
        secretKey: String,
        webhookSecret: String,
      },

      paypal: {
         name:{
          type:String,
          default:"Paypal"
        },
        enabled: {
          type: Boolean,
          default: false,
        },
        clientId: String,
        clientSecret: String,
        icon:String,
        mode: {
          type: String,
          enum: ["sandbox", "live"],
          default: "sandbox",
        },
      },

      razorpay: {
         name:{
          type:String,
          default:"RazorPay"
        },
        enabled: {
          type: Boolean,
          default: false,
        },
        icon:String,
        keyId: String,
        keySecret: String,
      },
    },

    refundPolicy: {
      enabled: {
        type: Boolean,
        default: true,
      },

      refundDays: {
        type: Number,
        default: 7,
      },
    },

    minimumOrderAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const PaymentSetting = mongoose.model("PaymentSettings", paymentSettingsSchema);
export default PaymentSetting;
