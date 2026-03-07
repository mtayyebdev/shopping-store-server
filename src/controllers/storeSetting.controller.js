import StoreSetting from "../models/storeSetting.model.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";
import {
  UploadToCloudinary,
  DeleteImageFromCloudinary,
} from "../utils/uploadFile.js";

// get setting / admin
const getStoreSettingAdminController = asyncHandler(async (req, res) => {
  const setting = await StoreSetting.findOne();

  if (!setting) {
    await StoreSetting.create({
      storeName: "Shopping Store",
      storeEmail: "shopping@gmail.com",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Setting found",
    data: setting,
  });
});

// update setting / admin
const updateStoreSettingAdminController = asyncHandler(async (req, res) => {
  const {
    storeName,
    storeEmail,
    supportEmail,
    phone,
    currencyCode,
    currencySymbol,
    country,
    city,
    state,
    postalCode,
    fullAddress,
    taxEnabled,
    taxRate,
    shippingEnabled,
    freeShipping,
    shippingCharge,
    freeShippingMinOrder,
    autoConfirmOrder,
    cancelOrderTime,
    socialLinks,
    language,
    lowStockAlert,
  } = req.body;
  const logo = req.files?.["logo"]?.[0] || "";
  const favicon = req.files?.["favicon"]?.[0] || "";

  const setting = await StoreSetting.findOne();

  if (storeName) setting.storeName = storeName;
  if (storeEmail) setting.storeEmail = storeEmail;
  if (supportEmail) setting.supportEmail = supportEmail;
  if (phone) setting.phone = phone;
  if (currencyCode) setting.currency.code = currencyCode;
  if (currencySymbol) setting.currency.symbol = currencySymbol;
  if (country) setting.address.country = country;
  if (state) setting.address.state = state;
  if (city) setting.address.city = city;
  if (postalCode) setting.address.postalCode = postalCode;
  if (fullAddress) setting.address.fullAddress = fullAddress;
  if (taxEnabled) setting.tax.enabled = taxEnabled;
  if (taxRate) setting.tax.taxRate = taxRate;
  if (shippingEnabled) setting.shipping.enabled = shippingEnabled;
  if (freeShipping) setting.shipping.freeShipping = freeShipping;
  if (shippingCharge) setting.shipping.shippingCharge = shippingCharge;
  if (freeShippingMinOrder) {
    setting.shipping.freeShippingMinOrder = freeShippingMinOrder;
  }
  if (autoConfirmOrder) {
    setting.orderSettings.autoConfirmOrder = autoConfirmOrder;
  }
  if (cancelOrderTime) setting.orderSettings.cancelOrderTime = cancelOrderTime;
  if (socialLinks) setting.socialLinks = socialLinks;
  if (language) setting.language = language;
  if (lowStockAlert) setting.lowStockAlert = lowStockAlert;

  if (logo?.path) {
    const uploadedLogo = await UploadToCloudinary(logo?.path, "Store Logo");

    if (!uploadedLogo?.url) {
      throw new APIError("Something went wrong while uploading logo", 400);
    }

    if (setting.logo?.url) {
      const deletedLogo = await DeleteImageFromCloudinary(
        setting.logo.publicId,
      );

      if (!deletedLogo) {
        throw new APIError("Something went wrong while deleting old logo", 400);
      }
    }

    setting.logo.url = uploadedLogo?.secure_url;
    setting.logo.publicId = uploadedLogo?.public_id;
  }

  if (favicon?.path) {
    const uploadedFavicon = await UploadToCloudinary(
      favicon?.path,
      "Store Logo",
    );

    if (!uploadedFavicon?.url) {
      throw new APIError("Something went wrong while uploading favicon", 400);
    }

    if (setting.favicon.url) {
      const deletedFavicon = await DeleteImageFromCloudinary(
        setting.favicon.publicId,
      );

      if (!deletedFavicon) {
        throw new APIError(
          "Something went wrong while deleting old favicon",
          400,
        );
      }
    }

    setting.favicon.url = uploadedFavicon?.secure_url;
    setting.favicon.publicId = uploadedFavicon?.public_id;
  }

  await setting.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Setting updated successfully",
  });
});

export { getStoreSettingAdminController, updateStoreSettingAdminController };
