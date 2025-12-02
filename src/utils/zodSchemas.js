import * as z from "zod";

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

const userInfoSchema=z.object({
  region: z.string().min(2,"Region must be at least 2 characters"),
  city: z.string().min(2,"City must be at least 2 characters"),
  district: z.string().min(2,"District must be at least 2 characters"),
  phone: z.string().min(11,"Phone must be at least 11 characters"),
  name: z.string().min(4,"Name must be at least 4 characters"),
  address: z.string().min(10,"Address must be at least 10 characters"),
  landmark: z.string().optional(),
  shipTo: z.enum(["home","office"]).optional(),
  defaultShipping: z.boolean().optional()
})

const productSchema=z.object({
  name:z.string().min(4,"Product name must be at least 4 characters"),
  price:z.number().min(1,"Product price must be at least 1"),
  tags:z.array().min(1,"Product tags must be at least 1"),
  stock:z.number().min(1,"Product stock must be at least 1"),
  longDesc:z.string().min(10,"Product long description must be at least 10 characters"),
  shortDesc:z.string().min(10,"Product short description must be at least 10 characters")
})

export { signInSchema, signUpSchema,productSchema,userInfoSchema };
