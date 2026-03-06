import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      default: "PKR",
    },

    paymentMethods: {
      cod: {
        enabled: {
          type: Boolean,
          default: true,
        },
      },

      stripe: {
        enabled: {
          type: Boolean,
          default: false,
        },
        publicKey: String,
        secretKey: String,
        webhookSecret: String,
      },

      paypal: {
        enabled: {
          type: Boolean,
          default: false,
        },
        clientId: String,
        clientSecret: String,
        mode: {
          type: String,
          enum: ["sandbox", "live"],
          default: "sandbox",
        },
      },

      razorpay: {
        enabled: {
          type: Boolean,
          default: false,
        },
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
