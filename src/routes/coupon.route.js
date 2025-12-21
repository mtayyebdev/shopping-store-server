import {
  couponsAdminController,
  createCouponAdminController,
  deleteCouponAdminController,
  updateCouponAdminController,
  useCouponController,
  singleCouponAdminController,
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
  createCouponAdminController
);
CouponRouter.route("/admin/update/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  validateWithZod(updateCouponSchema),
  updateCouponAdminController
);
CouponRouter.route("/admin/delete/:id").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteCouponAdminController
);
CouponRouter.route("/admin/coupons").get(
  verifyUser,
  authorizeUser(["admin"]),
  couponsAdminController
);
CouponRouter.route("/admin/single-coupon/:id").get(
  verifyUser,
  authorizeUser(["admin"]),
  singleCouponAdminController
);

export { CouponRouter };
