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

const signUpController = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const emailExist = await User.findOne({ email });

  if (emailExist) {
    throw new APIError("User already exist", 400);
  }

  await User.create(
    {
      name,
      email,
      password,
    },
    { validateBeforeSave: true }
  );

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
    }
  );

  await res.cookie("userToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
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
  const user = await User.findById(req.user._id).select("-password");

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
    userAddress.defaultShipping = false;
  }

  user.addresses.push(newAddress);
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Address added successfully.",
  });
});

const updateUserInfoController = asyncHandler(async (req, res) => {
  const { region, city, district, phone, name, landmark, address, shipTo } =
    req.body;
  const { id } = req.params;

  const user = await User.findById(req.user._id);
  const userAddress = user.addresses?.find(
    (info) => info._id.toString() === id
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

  await userAddress.save();
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Info updated successfully.",
  });
});

const setDefaultShippingController = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);
  const userAddress = user.addresses?.find(
    (info) => info._id.toString() === addressId
  );

  if (!userAddress) {
    throw new APIError("User address not found.", 404);
  }

  user.addresses.forEach((info) => {
    info.defaultShipping = false;
  });

  userAddress.defaultShipping = true;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Default shipping address set successfully.",
  });
});

const deleteUserInfoController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user?._id);

  const userAddresses = user.addresses?.filter(
    (info) => info._id.toString() !== id
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

// admin controllers.........
const allUsersAdminController = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");

  return res.status(200).json({
    success: true,
    message: "User found.",
    data: users,
  });
});

const singleUserAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("User not found.", 400);
  }

  const user = await User.findById(id);

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

  let publicid = user.avatar?.publicId;

  try {
    await user.deleteOne();

    if (publicid) {
      await DeleteImageFromCloudinary(publicid);
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    throw new APIError("Error deleting user or avatar: " + error.message, 500);
  }
});

const updateUserAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password, gender, phone, birthDay } = req.body;
  const file = req.file || "";

  if (!id) {
    throw new APIError("User not found.", 400);
  }

  const user = await User.findById(id);

  if (!user) {
    throw new APIError("User not found.", 404);
  }

  if (email) {
    if (!isValidEmail(email)) {
      throw new APIError("Invalid email", 400);
    }

    user.email = email;
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (birthDay) user.birthDay = birthDay;
  if (gender) user.gender = gender;
  if (password) user.password = password;

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
    message: "User updated successfully.",
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
  if (defaultShipping) userAddress.defaultShipping = defaultShipping;
  if (defaultBilling) userAddress.defaultBilling = defaultBilling;

  await userAddress.save();
  await user.save();

  return res.status(200).json({
    success: true,
    message: "User info updated successfully.",
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
  setDefaultShippingController,
  deleteUserInfoController,
  forgotPasswordController,
  resetPasswordController,
  sendOTPController,
  verifyOTPController,
};
