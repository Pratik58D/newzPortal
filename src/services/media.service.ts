import cloudinary from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { extractPublicId, uploadToCloudinary } from "../utils/imageHandling.js";

export const uploadNewsImages = async (
    files: Express.Multer.File[]
) => {
    try {
        return await uploadToCloudinary(files);
    } catch (error) {
        throw new ApiError(500, "Failed to upload news image", error);
    }
}

export const deleteNewsImages = async (
    imageUrls: string[]
) => {
    try {
        for (const imageUrl of imageUrls) {
            const publicId = extractPublicId(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }
    } catch (error) {
        throw new ApiError(
            500,
            "Failed to delete images from storage",
            error
        );
    }
}