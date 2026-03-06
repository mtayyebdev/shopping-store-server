import {
  createReturnController,
  getReturnsAdminController,
  getReturnsController,
  updateReturnStatusAdminController,
  getReturnAdminController,
  deleteReturnAdminController,
  updateReturnActionStatusAdminController,
} from "../controllers/return.controller.js";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";
import { upload } from "../utils/uploadFile.js";
import { Router } from "express";

const ReturnRouter = Router();

ReturnRouter.route("/create").post(
  verifyUser,
  upload.array("images", 5),
  createReturnController,
);
ReturnRouter.route("/returns").get(verifyUser, getReturnsController);

// admin routes............
ReturnRouter.route("/admin/returns").get(
  verifyUser,
  authorizeUser(["admin"]),
  getReturnsAdminController,
);
ReturnRouter.route("/admin/return/:returnId").get(
  verifyUser,
  authorizeUser(["admin"]),
  getReturnAdminController,
);
ReturnRouter.route("/admin/update-status/:returnId").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updateReturnStatusAdminController,
);
ReturnRouter.route("/admin/delete/:returnId").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteReturnAdminController,
);
ReturnRouter.route("/admin/update-action-status/:returnId").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updateReturnActionStatusAdminController,
);

export { ReturnRouter };
