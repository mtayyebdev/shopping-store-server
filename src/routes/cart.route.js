import {
  cartsController,
  createCartController,
  deleteCartController,
  deleteManyCartsController,
  updateCartController,
} from "../controllers/cart.controller.js";
import { verifyUser } from "../middlewares/verifyUser.middleware.js";
import express from "express";

const CartRouter = express.Router();

CartRouter.route("/create/:productId").post(verifyUser, createCartController);
CartRouter.route("/update/:id").patch(verifyUser, updateCartController);
CartRouter.route("/delete/:id").delete(verifyUser, deleteCartController);
CartRouter.route("/delete-many").delete(verifyUser, deleteManyCartsController);
CartRouter.route("/carts").get(verifyUser, cartsController);

export { CartRouter };
