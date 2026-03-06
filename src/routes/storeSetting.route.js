import express from "express";
import {
  getStoreSettingAdminController,
  updateStoreSettingAdminController,
} from "../controllers/storeSetting.controller.js";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";
import { upload } from "../utils/uploadFile.js";

const StoreSettingRouter = express.Router();

StoreSettingRouter.route("/admin/get-setting").get(
  verifyUser,
  authorizeUser(["admin"]),
  getStoreSettingAdminController,
);
StoreSettingRouter.route("/admin/update-setting").patch(
  verifyUser,
  authorizeUser(["admin"]),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updateStoreSettingAdminController,
);

export { StoreSettingRouter };
