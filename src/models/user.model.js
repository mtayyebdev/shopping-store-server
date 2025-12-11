import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userInfo = new mongoose.Schema(
  {
    region: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    landmark: String,
    shipTo: {
      type: String,
      default: "home",
      enum: ["home", "office"],
    },
    defaultShipping: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    avatar: {
      url: String,
      publicId: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    addresses: [userInfo],
    birthDay: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    verifyEmailCode: String,
    verifyEmailExpire: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.resetPassToken = function () {
  const token = jwt.sign(
    {
      userId: this._id,
      email: this.email,
    },
    process.env.JWT_TOKEN,
    {
      expiresIn: 15 * 60 * 1000, // 15 minutes
    }
  );
  this.resetPasswordToken = token;
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  return token;
};

const User = mongoose.model("User", userSchema);
export default User;
