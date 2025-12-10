import multer, { diskStorage } from "multer";
import { v2 as cloudinary } from "cloudinary";
import { APIError } from "./apiError.js";

const storage = diskStorage({});
const upload = multer({ storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UploadToCloudinary = async (image, folder = "products") => {
  try {
    const file = await cloudinary.uploader.upload(image, {
      folder: `shopping-store/${folder}`,
    });

    if (!file.url) {
      throw new APIError("File uploading error.", 400);
    }

    return file;
  } catch (error) {
    throw new APIError(error.message, 400);
  }
};

const DeleteImageFromCloudinary = async (publicId) => {
  try {
    const file = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    if (file.result != "ok") {
      throw new APIError("Image deleting error.");
    }
    return true;
  } catch (error) {
    throw new APIError(error.message, 400);
  }
};

export { upload, UploadToCloudinary, DeleteImageFromCloudinary };
