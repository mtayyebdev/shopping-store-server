import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const deliveryBoySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    email: String,
    password: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ["bike", "car", "cycle"],
      default: "bike",
    },
    vehicleNumber: String,
    currentOrders: {
      type: Number,
      default: 0,
    },
    location: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    address: {
      country: String,
      city: String,
      state: String,
      postalCode: String,
      fullAddress: String,
    },
    actionStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
  },
  { timestamps: true },
);

deliveryBoySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

deliveryBoySchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

deliveryBoySchema.methods.generateJWTToken = async function () {
  return jwt.sign(
    {
      ID: this._id,
      phone: this.phone,
    },
    process.env.JWT_TOKEN,
    {
      expiresIn: "3d",
    },
  );
};

const DeliveryBoy = mongoose.model("DeliveryBoy", deliveryBoySchema);
export default DeliveryBoy;
