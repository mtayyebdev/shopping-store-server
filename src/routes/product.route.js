import express from "express";
import {
  createProductAdminController,
  createProductReviewController,
  deleteProductAdminController,
  deleteReviewController,
  featuredProductsController,
  newArrivalsProductsController,
  popularProductsController,
  productsAdminController,
  productsController,
  relatedProductsController,
  searchProductController,
  singleProductAdminController,
  singleProductController,
  topRatedProductsController,
  updateProductAdminController,
} from "../controllers/product.controller.js";
import {
  authorizeUser,
  verifyUser,
} from "../middlewares/verifyUser.middleware.js";
import { upload } from "../utils/uploadFile.js";

const ProductRouter = express.Router();

// public routes...............
ProductRouter.route("/create-review/:productId").post(
  verifyUser,
  upload.array("images"),
  createProductReviewController
);
ProductRouter.route("/delete-review/:productId/:reviewId").delete(
  verifyUser,
  deleteReviewController
);
ProductRouter.route("/featured").get(featuredProductsController);
ProductRouter.route("/new-arrivals").get(newArrivalsProductsController);
ProductRouter.route("/popular").get(popularProductsController);
ProductRouter.route("/products").get(productsController);
ProductRouter.route("/related/:productId").get(relatedProductsController);
ProductRouter.route("/product/:slug").get(singleProductController);
ProductRouter.route("/top-rated").get(topRatedProductsController);
ProductRouter.route("/search").get(searchProductController);

// admin routes...................
ProductRouter.route("/admin/create").post(
  verifyUser,
  authorizeUser(["admin"]),
  upload.single("image"),
  upload.array("images", 16),
  createProductAdminController
);
ProductRouter.route("/admin/products").get(
  verifyUser,
  authorizeUser(["admin"]),
  productsAdminController
);
ProductRouter.route("/admin/product/:id").get(
  verifyUser,
  authorizeUser(["admin"]),
  singleProductAdminController
);
ProductRouter.route("/admin/update/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  upload.single("image"),
  upload.array("images"),
  updateProductAdminController
);
ProductRouter.route("/admin/delete/:id").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteProductAdminController
);

export { ProductRouter };
