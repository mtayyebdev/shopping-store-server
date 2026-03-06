import mongoose from "mongoose";

const storeSettingSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    storeEmail: {
      type: String,
      required: true,
      lowercase: true,
    },

    supportEmail: {
      type: String,
      lowercase: true,
    },

    phone: {
      type: String,
    },

    logo: {
      type: String,
    },

    favicon: {
      type: String,
    },

    currency: {
      code: {
        type: String,
        default: "USD",
      },

      symbol: {
        type: String,
        default: "$",
      },
    },

    address: {
      country: String,
      city: String,
      state: String,
      postalCode: String,
      fullAddress: String,
    },

    tax: {
      enabled: {
        type: Boolean,
        default: false,
      },

      taxRate: {
        type: Number,
        default: 0,
      },
    },

    shipping: {
      enabled: {
        type: Boolean,
        default: true,
      },

      freeShipping: {
        type: Boolean,
        default: false,
      },

      shippingCharge: {
        type: Number,
        default: 0,
      },

      freeShippingMinOrder: {
        type: Number,
        default: 0,
      },
    },

    orderSettings: {
      autoConfirmOrder: {
        type: Boolean,
        default: false,
      },

      cancelOrderTime: {
        type: Number, // minutes
        default: 30,
      },
    },

    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
    },
    language: String,
    lowStockAlert: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true },
);

const StoreSetting = mongoose.model("StoreSetting", storeSettingSchema);
export default StoreSetting;
