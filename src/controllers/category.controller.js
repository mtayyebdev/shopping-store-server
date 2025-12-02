import Category from "../models/category.model.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";
import {
  UploadToCloudinary,
  DeleteImageFromCloudinary,
} from "../utils/uploadFile.js";
import slugify from "slugify";

const categoriesController = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  return res.status(200).json({
    success: true,
    message: "Categories found",
    data: categories,
  });
});

// admin categories controllers..................
const createCategoryAdminController = asyncHandler(async (req, res) => {
  const { name, parent } = req.body;
  const file = req.file || "";

  if (!name) {
    throw new APIError("Category name is required.", 400);
  }

  const categorySlug = slugify(name);

  const image = {};
  if (file.path) {
    const uploadedImage = await UploadToCloudinary(file.path, "categories");
    image.url = uploadedImage.secure_url;
    image.publicId = uploadedImage.public_id;
  }

  if (!image.url || !image.publicId) {
    throw new APIError("Something went wrong during file uploading.", 400);
  }

  const category = await Category.create({
    name,
    slug: categorySlug,
    parent,
    image,
  });

  if (!category) {
    throw new APIError("Something went wrong.", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Category created successfully.",
  });
});

const categoriesAdminController = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  return res.status(200).json({
    success: true,
    message: "Categories found",
    data: categories,
  });
});

const singleCategoryAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Category ID is required.", 404);
  }

  const category = await Category.findById(id);

  if (!category) {
    throw new APIError("Category not found.", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Category found",
    data: category,
  });
});

const updateCategoryAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, parent } = req.body;
  const file = req.file || "";

  const category = await Category.findById(id);
  if (!category) {
    throw new APIError("Category not found", 404);
  }

  if (name) {
    category.name = name;
    category.slug = slugify(name);
  }

  if (parent) {
    category.parent = parent;
  }

  if (file?.path) {
    const uploadedImage = await UploadToCloudinary(file.path, "categories");
    if (uploadedImage.secure_url) {
      if (category.image?.publicId) {
        await DeleteImageFromCloudinary(category.image.publicId);
      }
      category.image = {
        url: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
      };
    }
  }

  await category.save();

  return res.status(200).json({
    success: true,
    message: "Category updated successfully.",
  });
});

const deleteCategoryAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Category ID is required.", 404);
  }

  await Category.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Category delete successfully.",
  });
});

export {
  categoriesAdminController,
  createCategoryAdminController,
  singleCategoryAdminController,
  updateCategoryAdminController,
  deleteCategoryAdminController,
  categoriesController,
};
