import express from "express";
import {
  categoriesAdminController,
  categoriesController,
  createCategoryAdminController,
  deleteCategoryAdminController,
  singleCategoryAdminController,
  updateCategoryAdminController,
} from "../controllers/category.controller.js";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";
import { upload } from "../utils/uploadFile.js";

const CategoryRouter = express.Router();

CategoryRouter.route("/categories").get(categoriesController);
CategoryRouter.route("/admin/categories").get(
  verifyUser,
  authorizeUser(["admin"]),
  categoriesAdminController
);
CategoryRouter.route("/admin/create").post(
  verifyUser,
  authorizeUser(["admin"]),
  upload.single("image"),
  createCategoryAdminController
);
CategoryRouter.route("/admin/category/:id").get(
  verifyUser,
  authorizeUser(["admin"]),
  singleCategoryAdminController
);
CategoryRouter.route("/admin/update/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  upload.single("image"),
  updateCategoryAdminController
);
CategoryRouter.route("/admin/delete/:id").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteCategoryAdminController
);

export { CategoryRouter };
