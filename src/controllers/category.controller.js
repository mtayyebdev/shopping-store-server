import Category from "../models/category.model.js";
import { asyncHandler } from "../utils/trycatch.js";
import { APIError } from "../utils/apiError.js";
import {
  UploadToCloudinary,
  DeleteImageFromCloudinary,
} from "../utils/uploadFile.js";
import slugify from "slugify";

const categoriesController = asyncHandler(async (req, res) => {
  const categories = await Category.find({ actionStatus: "active" }).select(
    "-filters",
  );

  return res.status(200).json({
    success: true,
    message: "Categories found",
    data: categories,
  });
});

// admin categories controllers..................
const createCategoryAdminController = asyncHandler(async (req, res) => {
  const { name, parent, filters } = req.body;
  const file = req.file || "";

  if (!name) {
    throw new APIError("Category name is required.", 400);
  }

  const categorySlug = slugify(name).toLowerCase();

  const image = {};
  if (file?.path) {
    const uploadedImage = await UploadToCloudinary(file.path, "categories");
    image.url = uploadedImage.secure_url;
    image.publicId = uploadedImage.public_id;
  }

  const category = await Category.create({
    name,
    slug: categorySlug,
    parent: parent || null,
    image,
    filters: filters ? JSON.parse(filters) : [],
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
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = String(req.query.search) || "";

  const statusFilter = String(req.query.status) || "all";

  const skip = (page - 1) * limit;

  const categories = await Category.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "parent",
        foreignField: "_id",
        as: "parent_info",
      },
    },
    {
      $unwind: {
        path: "$parent_info",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        name: { $regex: search, $options: "i" },
        ...(statusFilter !== "all" && { actionStatus: statusFilter }),
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        name: 1,
        image: 1,
        "parent_info.name": 1,
        "parent_info._id": 1,
        _id: 1,
        actionStatus: 1,
      },
    },
  ]);

  const totalCategories = await Category.countDocuments({
    name: { $regex: search, $options: "i" },
    ...(statusFilter !== "all" && { actionStatus: statusFilter }),
  });

  const categoryStates = await Category.aggregate([
    {
      $facet: {
        totalCategories: [
          { $match: { actionStatus: "active" } },
          { $count: "count" },
        ],
        totalParents: [
          { $match: { parent: null, actionStatus: "active" } },
          { $count: "count" },
        ],
        totalSubCategories: [
          { $match: { parent: { $ne: null }, actionStatus: "active" } },
          { $count: "count" },
        ],
      },
    },
    {
      $project: {
        totalCategories: {
          $ifNull: [{ $arrayElemAt: ["$totalCategories.count", 0] }, 0],
        },
        totalParents: {
          $ifNull: [{ $arrayElemAt: ["$totalParents.count", 0] }, 0],
        },
        totalSubCategories: {
          $ifNull: [{ $arrayElemAt: ["$totalSubCategories.count", 0] }, 0],
        },
      },
    },
  ]);

  const totalPages = Math.ceil(totalCategories / limit);

  return res.status(200).json({
    success: true,
    message: "Categories found",
    data: categories,
    categoryStates: categoryStates[0],
    totalCategories,
    totalPages,
  });
});

const allCategoriesAdminController = asyncHandler(async (req, res) => {
  const categories = await Category.find({ actionStatus: "active" }).select(
    "-image -slug -parent",
  );

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

  const category = await Category.findById(id).populate("parent");

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
  const { name, parent, filters } = req.body;
  const file = req.file || "";

  const category = await Category.findById(id);
  if (!category) {
    throw new APIError("Category not found", 404);
  }

  if (name) {
    category.name = name;
    category.slug = slugify(name).toLowerCase();
  }

  if (parent && typeof parent !== "string") {
    category.parent = parent;
  }

  if (filters) {
    category.filters = JSON.parse(filters);
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

  const category = await Category.findById(id);

  if (!category) {
    throw new APIError("Category not found.", 404);
  }

  if (category.image?.publicId) {
    await DeleteImageFromCloudinary(category.image.publicId).then(async () => {
      await category.deleteOne();
    });
  } else {
    await category.deleteOne();
  }

  return res.status(200).json({
    success: true,
    message: "Category deleted successfully.",
  });
});

const updateCategoryStatusAdminController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    throw new APIError("Category ID is required.", 404);
  }

  if (!status || !["active", "suspended", "deleted"].includes(status)) {
    throw new APIError(
      "Valid status is required (active, suspended, deleted).",
      400,
    );
  }

  const category = await Category.findById(id);

  if (!category) {
    throw new APIError("Category not found.", 404);
  }

  category.actionStatus = status;
  await category.save();

  return res.status(200).json({
    success: true,
    message: "Category status updated successfully.",
  });
});

export {
  categoriesAdminController,
  createCategoryAdminController,
  singleCategoryAdminController,
  updateCategoryAdminController,
  deleteCategoryAdminController,
  categoriesController,
  allCategoriesAdminController,
  updateCategoryStatusAdminController,
};
