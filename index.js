import express, { json, urlencoded } from "express";
import cors from "cors";
import "dotenv/config";
import { errorHandler } from "./src/middlewares/errorhandler.middleware.js";
import cookieParser from "cookie-parser";

// routes......... (user and admin both in same route......)...
import { AuthRouter } from "./src/routes/auth.route.js";
import { CategoryRouter } from "./src/routes/category.route.js";
import { ProductRouter } from "./src/routes/product.route.js";
import { CouponRouter } from "./src/routes/coupon.route.js";
import { CartRouter } from "./src/routes/cart.route.js";
import { OrderRouter } from "./src/routes/order.route.js";
import { ReturnRouter } from "./src/routes/return.route.js";
import { DeliveryBoyRouter } from "./src/routes/deliveryBoy.route.js";
import { StoreSettingRouter } from "./src/routes/storeSetting.route.js";
import { PaymentSettingRouter } from "./src/routes/paymentSetting.route.js";
import { DashboardRouter } from "./src/routes/dashboard.route.js";

// webHooks....
import { handleStripeWebHook } from "./src/utils/webHooks.js";

const app = express();

// webHooks for payments.............
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebHook,
);

const options = {
  origin: [process.env.CLIENT_URL],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
};
app.use(cookieParser());
app.use(cors(options));
app.use(json());
app.use(urlencoded({ extended: true }));

app.use("/api/auth", AuthRouter);
app.use("/api/category", CategoryRouter);
app.use("/api/product", ProductRouter);
app.use("/api/coupon", CouponRouter);
app.use("/api/cart", CartRouter);
app.use("/api/order", OrderRouter);
app.use("/api/return", ReturnRouter);
app.use("/api/rider", DeliveryBoyRouter);
app.use("/api/store-setting", StoreSettingRouter);
app.use("/api/payment-setting", PaymentSettingRouter);
app.use("/api/dashboard", DashboardRouter);
app.use("/icons", express.static("public/payments-icons"));

app.use(errorHandler);

export { app };
