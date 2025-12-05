import express, { json, urlencoded } from "express";
import cors from "cors";
import "dotenv/config";
import ConnectDB from "./src/config/db.config.js";
import { errorHandler } from "./src/middlewares/errorhandler.middleware.js";
import cookieParser from "cookie-parser";

// routes......... (user and admin both in same route......)...
import { AuthRouter } from "./src/routes/auth.route.js";
import { CategoryRouter } from "./src/routes/category.route.js";
import { ProductRouter } from "./src/routes/product.route.js";
import { CouponRouter } from "./src/routes/coupon.route.js";

const app = express();

const options = {
  origin: "*",
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

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server is running on port: ", PORT);
  ConnectDB();
});
