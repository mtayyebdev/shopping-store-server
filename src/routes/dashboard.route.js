import { Router } from "express";
import {
  totalSummaryAdminController,
  earningRevenueAdminController,
} from "../controllers/dashboard.controller.js";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";

const DashboardRouter = Router();

DashboardRouter.route("/admin/summary-data").get(
  verifyUser,
  authorizeUser(["admin"]),
  totalSummaryAdminController,
);
DashboardRouter.route("/admin/earning-revenue").get(
  earningRevenueAdminController,
);

export { DashboardRouter };
