import express from "express";
import {
  createDeliveryBoyAdminController,
  deleteDeliveryBoyAdminController,
  getAssignedOrdersController,
  getDeliveryBoysAdminController,
  getSingleDeliveryBoyAdminController,
  getSingleDeliveryBoyController,
  loginDeliveryBoyController,
  updateActionStatusDeliveryBoyAdminController,
  updateAssignedOrderStatusController,
  updateDeliveryBoyAdminController,
  logoutDeliveryBoyController,
  getAssignedOrderController,
} from "../controllers/deliveryBoy.controller.js";
import { validateWithZod } from "../middlewares/zodValidation.middleware.js";
import {
  authorizeUser,
  verifyUser,
  verifyRider,
} from "../middlewares/verifyUser.middleware.js";
import {
  updateDeliveryBoySchema,
  createDeliveryBoySchema,
} from "../utils/zodSchemas.js";

const DeliveryBoyRouter = express.Router();

DeliveryBoyRouter.route("/login").post(loginDeliveryBoyController);
DeliveryBoyRouter.route("/get-assigned-orders").get(
  verifyRider,
  getAssignedOrdersController,
);
DeliveryBoyRouter.route("/get-deliveryboy").get(
  verifyRider,
  getSingleDeliveryBoyController,
);
DeliveryBoyRouter.route("/update-orderstatus/:orderId").patch(
  verifyRider,
  updateAssignedOrderStatusController,
);
DeliveryBoyRouter.route("/logout").get(
  verifyRider,
  logoutDeliveryBoyController,
);
DeliveryBoyRouter.route("/get-order/:orderId").get(
  verifyRider,
  getAssignedOrderController,
);

// admin routes...............
DeliveryBoyRouter.route("/admin/create").post(
  verifyUser,
  authorizeUser(["admin"]),
  validateWithZod(createDeliveryBoySchema),
  createDeliveryBoyAdminController,
);
DeliveryBoyRouter.route("/admin/update/:riderId").patch(
  verifyUser,
  authorizeUser(["admin"]),
  validateWithZod(updateDeliveryBoySchema),
  updateDeliveryBoyAdminController,
);
DeliveryBoyRouter.route("/admin/delete/:deliveryBoyId").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteDeliveryBoyAdminController,
);
DeliveryBoyRouter.route("/admin/get-deliveryboys").get(
  verifyUser,
  authorizeUser(["admin"]),
  getDeliveryBoysAdminController,
);
DeliveryBoyRouter.route("/admin/get-deliveryboy/:deliveryBoyId").get(
  verifyUser,
  authorizeUser(["admin"]),
  getSingleDeliveryBoyAdminController,
);
DeliveryBoyRouter.route("/admin/update-actionstatus/:deliveryBoyId").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updateActionStatusDeliveryBoyAdminController,
);

export { DeliveryBoyRouter };
