import * as z from "zod";

const parseJsonIfString = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const optionalCoercedNumber = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.coerce.number().optional(),
);

const optionalCoercedBoolean = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.coerce.boolean().optional());

const specificationSchema = z.object({
  label: z.string(),
  content: z.array(z.string()),
});

// User schemas......................
const signUpSchema = z.object({
  name: z
    .string()
    .min(4, "Name must be at least 4 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be most 100 characters"),
});

const signInSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const userInfoSchema = z.object({
  region: z.string().min(2, "Region must be at least 2 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  district: z.string().min(2, "District must be at least 2 characters"),
  phone: z.string().min(11, "Phone must be at least 11 characters"),
  name: z.string().min(4, "Name must be at least 4 characters"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  landmark: z.string().optional(),
  shipTo: z.enum(["home", "office"]).optional(),
  defaultShipping: z.boolean().optional(),
});

// Product schemas..........................
const productSchema = z.object({
  name: z.string().min(4, "Product name must be at least 4 characters"),
  price: z.coerce.number().min(1, "Product price must be at least 1"),
  tags: z.preprocess(
    parseJsonIfString,
    z.array(z.string()).min(1, "Product tags must be at least 1"),
  ),
  stock: z.coerce.number().min(1, "Product stock must be at least 1"),
  longDesc: z
    .string()
    .min(10, "Product long description must be at least 10 characters"),
  shortDesc: z
    .string()
    .min(10, "Product short description must be at least 10 characters"),
  oldPrice: optionalCoercedNumber,
  shippingPrice: optionalCoercedNumber,
  returned: optionalCoercedNumber,
  sku: z.string({ error: "SKU is required" }),
  specifications: z
    .preprocess(parseJsonIfString, z.array(specificationSchema))
    .optional(),
  isFeatured: optionalCoercedBoolean,
  size: z.preprocess(parseJsonIfString, z.array(z.string())).optional(),
  color: z.preprocess(parseJsonIfString, z.array(z.string())).optional(),
  brand: z.string().optional(),
  categoryId: z.string({ error: "Please select category" }),
});

const updateProductSchema = z.object({
  name: z
    .string()
    .min(4, "Product name must be at least 4 characters")
    .optional(),
  price: z.coerce
    .number()
    .min(1, "Product price must be at least 1")
    .optional(),
  tags: z
    .preprocess(
      parseJsonIfString,
      z.array(z.string()).min(1, "Product tags must be at least 1"),
    )
    .optional(),
  stock: z.coerce
    .number()
    .min(1, "Product stock must be at least 1")
    .optional(),
  longDesc: z
    .string()
    .min(10, "Product long description must be at least 10 characters")
    .optional(),
  shortDesc: z
    .string()
    .min(10, "Product short description must be at least 10 characters")
    .optional(),
  oldPrice: optionalCoercedNumber,
  shippingPrice: optionalCoercedNumber,
  returned: optionalCoercedNumber,
  sku: z.string().optional(),
  specifications: z
    .preprocess(parseJsonIfString, z.array(specificationSchema))
    .optional(),
  isFeatured: optionalCoercedBoolean,
  size: z.preprocess(parseJsonIfString, z.array(z.string())).optional(),
  color: z.preprocess(parseJsonIfString, z.array(z.string())).optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  imgsIdsToDelete: z
    .preprocess(parseJsonIfString, z.array(z.string()))
    .optional(),
});

// Coupon schemas............
const createCouponSchema = z.object({
  code: z.string().min(8, "Coupon code must be at least 8 characters."),
  discountType: z.string(),
  discountValue: z.number(),
  minOrderAmount: z.number().optional(),
  maxOrderAmount: z.number().optional(),
  expiresIn: z.string().optional(),
  isActive: z.boolean().optional(),
  usageLimit: z.number().optional(),
});

const updateCouponSchema = z.object({
  code: z.string().min(8, "Coupon code must be at least 8 characters").optional(),
  discountType: z.string().optional(),
  discountValue: z.number().optional(),
  minOrderAmount: z.number().optional(),
  maxOrderAmount: z.number().optional(),
  expiresIn: z.string().optional(),
  usageLimit: z.number().optional(),
});

export {
  signInSchema,
  signUpSchema,
  productSchema,
  userInfoSchema,
  updateProductSchema,
  createCouponSchema,
  updateCouponSchema,
};
