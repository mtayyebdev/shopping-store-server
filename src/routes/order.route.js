import {
  cancelOrderController,
  createOrderController,
  deleteOrderAdminController,
  ordersAdminController,
  ordersController,
  singleOrderAdminController,
  singleOrderController,
  updateOrderPaymentController,
  updateOrderStatusAdminController,
  createDirectOrderController,
} from "../controllers/order.controller.js";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";
import express from "express";

const OrderRouter = express.Router();

OrderRouter.route("/create").post(verifyUser, createOrderController);
OrderRouter.route("/buy-now").post(createDirectOrderController);
OrderRouter.route("/orders").get(verifyUser, ordersController);
OrderRouter.route("/single-order/:id").get(verifyUser, singleOrderController);
OrderRouter.route("/cancel/:id").patch(verifyUser, cancelOrderController);
OrderRouter.route("/payment/:id").patch(
  verifyUser,
  updateOrderPaymentController
);

// admin controllers.....................
OrderRouter.route("/admin/orders").get(
  verifyUser,
  authorizeUser(["admin"]),
  ordersAdminController
);
OrderRouter.route("/admin/single-order/:id").get(
  verifyUser,
  authorizeUser(["admin"]),
  singleOrderAdminController
);
OrderRouter.route("/admin/delete/:id").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteOrderAdminController
);
OrderRouter.route("/admin/update-status/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updateOrderStatusAdminController
);

export { OrderRouter };
