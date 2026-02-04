import {
  createReturnController,
  getReturnsAdminController,
  getReturnsController,
  updateReturnStatusAdminController,
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
  upload.array("Images", 5),
  createReturnController,
);
ReturnRouter.route("/returns").get(verifyUser, getReturnsController);

// admin
ReturnRouter.route("/admin/returns").get(
  verifyUser,
  authorizeUser(["admin"]),
  getReturnsAdminController,
);
ReturnRouter.route("/admin/update/:returnId").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updateReturnStatusAdminController,
);

export {ReturnRouter};
