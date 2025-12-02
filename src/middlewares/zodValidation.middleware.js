import { ZodError } from "zod";
import { APIError } from "../utils/apiError.js";

export const validateWithZod = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0].message;
      return next(new APIError(message, 404));
    }
    return next(error);
  }
};
