import {
  couponsController,
  createCouponController,
  deleteCouponController,
  updateCouponController,
  useCouponController,
  singleCouponController,
} from "../controllers/coupon.controller.js";
import express from "express";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";
import { createCouponSchema, updateCouponSchema } from "../utils/zodSchemas.js";
import { validateWithZod } from "../middlewares/zodValidation.middleware.js";

const CouponRouter = express.Router();

CouponRouter.route("/apply").get(verifyUser, useCouponController);

// admin routes.............
CouponRouter.route("/admin/create").post(
  verifyUser,
  authorizeUser(["admin"]),
  validateWithZod(createCouponSchema),
  createCouponController
);
CouponRouter.route("/admin/update/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  validateWithZod(updateCouponSchema),
  updateCouponController
);
CouponRouter.route("/admin/delete/:id").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteCouponController
);
CouponRouter.route("/admin/coupons").get(
  verifyUser,
  authorizeUser(["admin"]),
  couponsController
);
CouponRouter.route("/admin/single-coupon").get(
  verifyUser,
  authorizeUser(["admin"]),
  singleCouponController
);

export { CouponRouter };
