import express from "express";
import {
  categoriesAdminController,
  categoriesController,
  createCategoryAdminController,
  deleteCategoryAdminController,
  singleCategoryAdminController,
  updateCategoryAdminController,
  allCategoriesAdminController,
  updateCategoryStatusAdminController
} from "../controllers/category.controller.js";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";
import { upload } from "../utils/uploadFile.js";

const CategoryRouter = express.Router();

CategoryRouter.route("/categories").get(categoriesController);

// admin routes..................
CategoryRouter.route("/admin/categories").get(
  verifyUser,
  authorizeUser(["admin"]),
  categoriesAdminController,
);
CategoryRouter.route("/admin/allcategories").get(
  verifyUser,
  authorizeUser(["admin"]),
  allCategoriesAdminController,
);
CategoryRouter.route("/admin/create").post(
  verifyUser,
  authorizeUser(["admin"]),
  upload.single("image"),
  createCategoryAdminController,
);
CategoryRouter.route("/admin/category/:id").get(
  verifyUser,
  authorizeUser(["admin"]),
  singleCategoryAdminController,
);
CategoryRouter.route("/admin/update/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  upload.single("image"),
  updateCategoryAdminController,
);
CategoryRouter.route("/admin/delete/:id").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteCategoryAdminController,
);
CategoryRouter.route("/admin/update-status/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updateCategoryStatusAdminController,
);

export { CategoryRouter };
