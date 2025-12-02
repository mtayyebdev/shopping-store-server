import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { APIError } from "../utils/apiError.js";

const verifyUser = async (req, res, next) => {
  try {
    const token = await req.cookies?.userToken || "";
    
    if (!token) throw new APIError("Invalid Token", 400);
    const validToken = jwt.verify(token, process.env.JWT_TOKEN);

    if (!validToken) {
      throw new APIError("Invalid Token", 400);
    }

    const user = await User.findById(validToken.UserId);

    if (!user) {
      throw new APIError("Invalid Token", 400);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const authorizeUser =
  (roles = []) =>
  (req, res, next) => {
    try {
      if (roles.length === 0 || !Array.isArray(roles)) {
        throw new APIError("You are accessing invalid route.", 400);
      }
      let currentUserRole = req.user.role;
      let isValidUser = roles.includes(currentUserRole);

      if (!isValidUser) {
        throw new APIError("You are accessing invalid route.", 400);
      }
      next();
    } catch (error) {
      next(error);
    }
  };

export { verifyUser, authorizeUser };
