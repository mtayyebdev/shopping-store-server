import express from "express";
import {
  allUsersAdminController,
  deleteUserAdminController,
  logoutController,
  updatePasswordController,
  signInController,
  signUpController,
  singleUserAdminController,
  updateUserAdminController,
  updateUserInfoAdminController,
  updateUserInfoController,
  updateUserProfileController,
  userController,
  createUserInfoController,
  setDefaultShippingController,
  deleteUserInfoController,
} from "../controllers/auth.controller.js";
import {
  verifyUser,
  authorizeUser,
} from "../middlewares/verifyUser.middleware.js";
import { validateWithZod } from "../middlewares/zodValidation.middleware.js";
import { signInSchema, signUpSchema,userInfoSchema } from "../utils/zodSchemas.js";
import { upload } from "../utils/uploadFile.js";

const AuthRouter = express.Router();

AuthRouter.route("/signup").post(
  validateWithZod(signUpSchema),
  signUpController
);
AuthRouter.route("/signin").post(
  validateWithZod(signInSchema),
  signInController
);
AuthRouter.route("/logout").get(verifyUser, logoutController);
AuthRouter.route("/user").get(verifyUser, userController);
AuthRouter.route("/update-profile").patch(
  verifyUser,
  upload.single("image"),
  updateUserProfileController
);
AuthRouter.route("/update-password").patch(
  verifyUser,
  updatePasswordController
);
AuthRouter.route("/create-user-info").post(
  verifyUser,
  validateWithZod(userInfoSchema),
  createUserInfoController
);
AuthRouter.route("/update-info/:id").patch(
  verifyUser,
  updateUserInfoController
);
AuthRouter.route("/set-default-shipping/:addressId").patch(
  verifyUser,
  setDefaultShippingController
);
AuthRouter.route("/delete-info/:id").delete(
  verifyUser,
  deleteUserInfoController
);

// Admin routes................................
AuthRouter.route("/admin/users").get(
  verifyUser,
  authorizeUser(["admin"]),
  allUsersAdminController
);
AuthRouter.route("/admin/user/:id").get(
  verifyUser,
  authorizeUser(["admin"]),
  singleUserAdminController
);
AuthRouter.route("/admin/delete-user/:id").delete(
  verifyUser,
  authorizeUser(["admin"]),
  deleteUserAdminController
);
AuthRouter.route("/admin/update-user-profile/:id").patch(
  verifyUser,
  authorizeUser(["admin"]),
  upload.single("image"),
  updateUserAdminController
);
AuthRouter.route("/admin/update-user-info/:userId").patch(
  verifyUser,
  authorizeUser(["admin"]),
  updateUserInfoAdminController
);

export { AuthRouter };
