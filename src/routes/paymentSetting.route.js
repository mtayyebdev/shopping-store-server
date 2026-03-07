import {
  getPaymentAdminController,
  updatePaymentAdminController,
  getPaymentController,
} from "../controllers/paymentSetting.controller.js";
import express from "express";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";

const PaymentSettingRouter = express.Router();

PaymentSettingRouter.route("/get-payments").get(getPaymentController);

// admin routes.....
PaymentSettingRouter.route("/admin/get-payment").get(
  verifyUser,
  authorizeUser(["admin"]),
  getPaymentAdminController,
);
PaymentSettingRouter.route("/admin/update-payment").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updatePaymentAdminController,
);

export { PaymentSettingRouter };
