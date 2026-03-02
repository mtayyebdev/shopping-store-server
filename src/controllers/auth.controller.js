import User from "../models/user.model.js";
import Otp from "../models/otp.model.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { isValidEmail } from "../utils/validationMethods.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  UploadToCloudinary,
  DeleteImageFromCloudinary,
} from "../utils/uploadFile.js";
import { generateOTP } from "../utils/generateOTP.js";
import Wishlist from "../models/wishlist.model.js";

const signUpController = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const emailExist = await User.findOne({ email });

  if (emailExist) {
    throw new APIError("This email is already registered. Please login.", 400);
  }

  await User.create({
    name,
    email,
    password,
  });

  return res.status(200).json({
    success: true,
    message: "Signup successfully.",
  });
});

const signInController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const emailExist = await User.findOne({ email });

  if (!emailExist) {
    throw new APIError("Account not found.", 400);
  }

  const passwordExist = await emailExist.comparePassword(password);

  if (!passwordExist) {
    throw new APIError("Account not found.", 400);
  }

  const token = jwt.sign(
    {
      UserId: emailExist._id,
      UserRole: emailExist.role,
      UserEmail: emailExist.email,
    },
    process.env.JWT_TOKEN,
    {
      expiresIn: process.env.JWT_EXPIREIN,
    },
  );

  await res.cookie("userToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "SignIn successfully.",
  });
});

const logoutController = asyncHandler(async (req, res) => {
  await res.cookie("userToken", {
    maxAge: 0,
  });

  return res.status(200).json({
    success: true,
    message: "Logout successfully.",
  });
});

const userController = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.user._id,
    actionStatus: "active",
  }).select("-password");

  if (!user) {
    throw new APIError("Profile data not found.", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Profile data found.",
    data: user,
  });
});

const updateUserProfileController = asyncHandler(async (req, res) => {
  const { name, phone, email, gender, birthDay } = req.body;
  const file = req.file || "";

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new APIError("User not found.", 404);
  }

  const publicid = user.avatar?.publicId;

  if (email) {
    if (!isValidEmail(email)) {
      throw new APIError("Invalid email.", 400);
    }
    user.email = email;
  }

  if (name?.length > 3) user.name = name;
  if (phone?.length > 10) user.phone = phone;
  if (gender) user.gender = gender;
  if (birthDay) user.birthDay = birthDay;

  if (file?.path) {
    const image = await UploadToCloudinary(file.path, "users");
    if (image.secure_url) {
      if (publicid) {
        await DeleteImageFromCloudinary(publicid);
      }

      user.avatar.url = image.secure_url;
      user.avatar.publicId = image.public_id;
    }
  }

  await user.save();
  return res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
  });
});

const createUserInfoController = asyncHandler(async (req, res) => {
  const {
    region,
    city,
    district,
    phone,
    name,
    address,
    landmark,
    shipTo,
    defaultShipping,
  } = req.body;

  const user = await User.findById(req.user._id);

  const newAddress = {
    region,
    city,
    district,
    phone,
    name,
    address,
    landmark,
    shipTo,
    defaultShipping,
  };

  if (defaultShipping == true && user?.addresses?.length > 0) {
    const userAddress = user.addresses.find((a) => a.defaultShipping === true);
    if (userAddress) userAddress.defaultShipping = false;
  }

  user.addresses.push(newAddress);
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Address added successfully.",
  });
});

const updateUserInfoController = asyncHandler(async (req, res) => {
  const {
    region,
    city,
    district,
    phone,
    name,
    landmark,
    address,
    shipTo,
    defaultShipping,
  } = req.body;
  const { id } = req.params;

  const user = await User.findById(req.user._id);
  const userAddress = user.addresses?.find(
    (info) => info._id.toString() === id,
  );

  if (!userAddress) {
    throw new APIError("User address not found.", 404);
  }

  if (region) {
    userAddress.region = region;
  }

  if (city) {
    userAddress.city = city;
  }

  if (district) {
    userAddress.district = district;
  }

  if (phone) {
    userAddress.phone = phone;
  }

  if (name) {
    userAddress.name = name;
  }

  if (landmark) {
    userAddress.landmark = landmark;
  }

  if (address) {
    userAddress.address = address;
  }

  if (shipTo) {
    userAddress.shipTo = shipTo;
  }

  if (defaultShipping) {
    user.addresses.forEach((info) => {
      info.defaultShipping = false;
    });
    userAddress.defaultShipping = defaultShipping;
  }

  await userAddress.save();
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Info updated successfully.",
  });
});

const deleteUserInfoController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user?._id);

  const userAddresses = user.addresses?.filter(
    (info) => info._id.toString() !== id,
  );

  user.addresses = userAddresses;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Info deleted successfully.",
  });
});

const updatePasswordController = asyncHandler(async (req, res) => {
  const { newPassword, oldPassword } = req.body;

  if (!newPassword || !oldPassword) {
    throw new APIError("Old password and new password are required.", 404);
  }

  const user = await User.findById(req.user?._id);

  const isvalidPassword = await user.comparePassword(oldPassword);

  if (!isvalidPassword) {
    throw new APIError("Wrong old password.", 400);
  }

  if (newPassword.length < 8) {
    throw new APIError("New password must be at least 8 characters.", 400);
  }

  user.password = newPassword;

  user.save();

  return res.status(200).json({
    success: true,
    message: "Password updated successfully.",
  });
});

const forgotPasswordController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new APIError("Email is required.", 404);
  }

  if (!isValidEmail(email)) {
    throw new APIError("Invalid email.", 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new APIError("Invalid email.", 400);
  }

  const resetToken = await user.resetPassToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const message = `
    <h1>Password Reset</h1>
    <p>Click the link below to reset your password:</p>
    <a href="${resetURL}" target="_blank">${resetURL}</a>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Reset link sent to email.",
    });
  } catch (error) {
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;
    await user.save({ validateBeforeSave: false });

    throw new APIError("Email could not be sent.", 400);
  }
});

const resetPasswordController = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    throw new APIError("Reset token is required.", 404);
  }

  if (!password) {
    throw new APIError("New Password is required.", 404);
  }

  const verifyToken = jwt.verify(token, process.env.JWT_TOKEN);

  if (!verifyToken) {
    throw new APIError("Invalid reset Token.", 400);
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new APIError("Invalid or expired token.", 400);
  }

  user.password = password;
  user.resetPasswordExpire = undefined;
  user.resetPasswordToken = undefined;

  await user.save();

  return res
    .status(200)
    .json({ success: true, message: "Password reset successful" });
});

const sendOTPController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new APIError("Email is required", 404);
  }

  await Otp.deleteOne({ email });

  const newOTP = generateOTP();
  const expiresAtOTP = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const code = newOTP;

  await Otp.create({ email, code, expiresAt: expiresAtOTP });

  await sendEmail({
    to: email,
    subject: "Email Verification - OTP",
    html: `<h2>Your OTP Code</h2><p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
  });

  return res.status(200).json({
    success: true,
    message: "OTP send successfully to your email.",
  });
});

const verifyOTPController = asyncHandler(async (req, res) => {
  const { email, otpCode } = req.body;

  if (!email || !otpCode) {
    throw new APIError("Email and OTP code are required.", 404);
  }

  const otpExist = await Otp.findOne({ email });

  if (!otpExist) {
    throw new APIError("OTP not found or expired.", 400);
  }

  if (new Date() > otpExist.expiresAt) {
    await Otp.deleteOne({ email });
    throw new APIError("OTP has expired.", 400);
  }

  if (otpCode !== otpExist?.code) {
    throw new APIError("Invalid OTP code.", 400);
  }

  await Otp.deleteOne({ email });

  return res.status(200).json({
    success: true,
    message: "Email verified successfully",
    verified: true,
  });
});

const createWishlistController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { productId } = req.params;

  if (!userId) {
    throw new APIError("You need to be logged in.", 400);
  }

  if (!productId) {
    throw new APIError("Product Id is required.", 400);
  }

  const wishlistExist = await Wishlist.findOne({ userId, productId });

  if (wishlistExist) {
    throw new APIError("Product already in wishlist.", 400);
  }

  const data = await Wishlist.create({ userId, productId });

  if (!data) {
    throw new APIError(
      "Something went wrong while adding product to wishlist.",
      500,
    );
  }

  return res.status(200).json({
    success: true,
    message: "Product added to wishlist successfully.",
    data,
  });
});

const deleteWishlistController = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  if (!productId || !userId) {
    throw new APIError("Product ID and User ID is required.", 400);
  }

  const wishlistExist = await Wishlist.findOne({ userId, productId });

  if (!wishlistExist) {
    throw new APIError("Product not found in wishlist.", 400);
  }

  await wishlistExist.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Product removed from wishlist successfully.",
  });
});

const getWishlistController = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const wishlists = await Wishlist.find({ userId }).populate({
    path: "productId",
    select: "name price discount slug image oldPrice ratings isFeatured",
  });

  return res.status(200).json({
    success: true,
    message: "Wishlist retrieved successfully.",
    data: wishlists,
  });
});

// admin controllers.........
const allUsersAdminController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search || "";
  const statusFilter = req.query.status || "";
  const skip = (page - 1) * limit;

  const users = await User.aggregate([
    {
      $match: {
        $or: [
          { name: { $regex: String(search), $options: "i" } },
          { phone: { $regex: String(search), $options: "i" } },
          { email: { $regex: String(search), $options: "i" } },
        ],
        actionStatus:
          statusFilter === "all"
            ? { $in: ["active", "suspended", "deleted"] }
            : statusFilter,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        image: 1,
        name: 1,
        email: 1,
        phone: 1,
        role: 1,
        isVerified: 1,
        actionStatus: 1,
        createdAt: 1,
      },
    },
  ]);

  const usersStats = await User.aggregate([
    {
      $facet: {
        totalUsers: [
          { $match: { actionStatus: "active" } },
          { $count: "count" },
        ],
        verifiedUsers: [
          {
            $match: { isVerified: true, actionStatus: "active" },
          },
          {
            $count: "count",
          },
        ],
        adminUsers: [
          {
            $match: { role: "admin", actionStatus: "active" },
          },
          {
            $count: "count",
          },
        ],
        suspended: [
          {
            $match: {
              actionStatus: "suspended",
            },
          },
          {
            $count: "count",
          },
        ],
      },
    },
    {
      $project: {
        totalUsers: {
          $ifNull: [{ $arrayElemAt: ["$totalUsers.count", 0] }, 0],
        },
        verifiedUsers: {
          $ifNull: [{ $arrayElemAt: ["$verifiedUsers.count", 0] }, 0],
        },
        adminUsers: {
          $ifNull: [{ $arrayElemAt: ["$adminUsers.count", 0] }, 0],
        },
        suspended: {
          $ifNull: [{ $arrayElemAt: ["$suspended.count", 0] }, 0],
        },
      },
    },
  ]);

  const totalUsers = await User.countDocuments({
    $or: [
      { name: { $regex: String(search), $options: "i" } },
      { phone: { $regex: String(search), $options: "i" } },
      { email: { $regex: String(search), $options: "i" } },
    ],
    actionStatus:
      statusFilter === "all"
        ? { $in: ["active", "suspended", "deleted"] }
        : statusFilter,
  });

  const totalPages = Math.ceil(totalUsers / limit);

  return res.status(200).json({
    success: true,
    message: "User found.",
    totalPages,
    usersStats: usersStats[0],
    totalUsers,
    data: users,
  });
});

const singleUserAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("User not found.", 400);
  }

  const user = await User.findById(id).select(
    "-password -deletedAt -resetPasswordToken -resetPasswordExpire -verifyEmailCode -verifyEmailExpire",
  );

  if (!user) {
    throw new APIError("User not found.", 400);
  }

  return res.status(200).json({
    success: true,
    message: "User data found.",
    data: user,
  });
});

const deleteUserAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("User ID not found.", 404);
  }

  const user = await User.findById(id);

  if (!user) {
    throw new APIError("User not found.", 404);
  }

  user.deleteOne();

  await user.save();

  return res.status(200).json({
    success: true,
    message: "User deleted successfully.",
  });
});

const updateUserAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, gender, role, birthDay, isVerified } = req.body;
  const file = req.file || "";

  if (!id) {
    throw new APIError("User not found.", 400);
  }

  const user = await User.findById(id);

  if (!user) {
    throw new APIError("User not found.", 404);
  }

  if (name) user.name = name;
  if (birthDay) user.birthDay = birthDay;
  if (gender) user.gender = gender;
  if (role) user.role = role;
  if (isVerified !== undefined) user.isVerified = isVerified;

  if (file?.path) {
    const uploadFile = await UploadToCloudinary(file.path, "users");
    if (uploadFile.secure_url) {
      if (user.avatar?.publicId) {
        await DeleteImageFromCloudinary(user.avatar.publicId);
      }

      user.avatar.url = uploadFile.secure_url;
      user.avatar.publicId = uploadFile.public_id;
    }
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: "User profile updated successfully.",
  });
});

const updateUserInfoAdminController = asyncHandler(async (req, res) => {
  const {
    region,
    city,
    district,
    phone,
    name,
    landmark,
    address,
    shipTo,
    defaultShipping,
    defaultBilling,
    infoId,
  } = req.body;
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    throw new APIError("User not found.", 404);
  }

  const userAddress = user.addresses?.find((info) => info == infoId);

  if (region) userAddress.region = region;
  if (city) userAddress.city = city;
  if (district) userAddress.district = district;
  if (phone) userAddress.phone = phone;
  if (name) userAddress.name = name;
  if (landmark) userAddress.landmark = landmark;
  if (address) userAddress.address = address;
  if (shipTo) userAddress.shipTo = shipTo;
  if (defaultShipping !== undefined)
    userAddress.defaultShipping = defaultShipping;
  if (defaultBilling !== undefined) userAddress.defaultBilling = defaultBilling;

  await userAddress.save();
  await user.save();

  return res.status(200).json({
    success: true,
    message: "User info updated successfully.",
  });
});

const updateUserStatusAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    throw new APIError("User not found.", 400);
  }

  if (!status || !["active", "suspended", "deleted"].includes(status)) {
    throw new APIError("Status is required.", 400);
  }

  const user = await User.findById(id);

  if (!user) {
    throw new APIError("User not found.", 404);
  }

  user.actionStatus = status;

  await user.save();
  return res.status(200).json({
    success: true,
    message: "User status updated successfully.",
  });
});

export {
  allUsersAdminController,
  signInController,
  signUpController,
  logoutController,
  updateUserAdminController,
  updateUserInfoAdminController,
  deleteUserAdminController,
  singleUserAdminController,
  updatePasswordController,
  updateUserInfoController,
  updateUserProfileController,
  userController,
  createUserInfoController,
  createWishlistController,
  deleteWishlistController,
  getWishlistController,
  updateUserStatusAdminController,
  deleteUserInfoController,
  forgotPasswordController,
  resetPasswordController,
  sendOTPController,
  verifyOTPController,
};
