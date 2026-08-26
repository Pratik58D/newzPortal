import { ApiError } from "../utils/ApiError.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/imageHandling.js";
import { getStorageProvider } from "../utils/provider/storageProvider.factory.js";

export const MEDIA_FOLDERS = {
    NEWS: "news-images",
    REPORTER: "reporter-images",
    CATEGORY: "category-images",
} as const;

export interface MediaImage {
    url: string;
    key: string;
}


//upload news images
export const uploadMediaImages = async (
    files: Express.Multer.File[],
    folder: string
) => {
    if (!files.length) {
        return [];
    }

    try {
        const provider = getStorageProvider();
        return await provider.upload(files, folder);
    } catch (error) {
        throw new ApiError(500, "Failed to upload news image", error);
    }
}

//delete the news
export const deleteMediaImages = async (
    images: MediaImage[]
): Promise<void> => {
    if (!images.length) {
        return;
    }

    try {
        const provider = getStorageProvider();
        await provider.delete(images.map((image) => image.key));
    } catch (error) {
        throw new ApiError(
            500,
            "Failed to delete images from storage",
            error
        );
    }
}


//update news image
//1. existingImages = images currently stored in database
//2. keptpublicIDS:  Public IDs of existing images the user wants to keep
//3. newFiles:New images uploaded by the user
// example : existing A B C D E  , keptPublicIds: A C E  ; newFiles: X Y ; Result: A X C Y E ;B and D are deleted from Cloudinary.


export const updateMediaImages = async (
    existingImages: MediaImage[],
    keptKeys: string[],
    newFiles: Express.Multer.File[],
    folder: string
): Promise<MediaImage[]> => {
    try {
        // 1. Find images that need to be deleted
        const imagesToDelete = existingImages.filter(
            (image) => !keptKeys.includes(image.key)
        );

        // 2. Delete removed images from Cloudinary
        if (imagesToDelete.length > 0) {
            await deleteMediaImages(imagesToDelete);
        }

        // 3. Keep existing images
        const keptImages = existingImages.filter(
            (image) => keptKeys.includes(image.key)
        );

        // 4. Upload new images
        const newImages = await uploadMediaImages(newFiles, folder);

        // 5. Return final image list
        return [
            ...keptImages,
            ...newImages,
        ];

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            500,
            "Failed to update news images",
            error
        );

    }

}



// ---- thin, module-specific wrappers -----------------------------------
// Keeps existing call sites (news.controller.ts etc) unchanged - they don't
// need to know about folders or providers at all.
 
export const uploadNewsImages = (files: Express.Multer.File[]) =>
    uploadMediaImages(files, MEDIA_FOLDERS.NEWS);
 
export const deleteNewsImages = deleteMediaImages;
 
export const updateNewsImages = (
    existingImages: MediaImage[],
    keptKeys: string[],
    newFiles: Express.Multer.File[]
) => updateMediaImages(existingImages, keptKeys, newFiles, MEDIA_FOLDERS.NEWS);
 
export const uploadReporterImages = (files: Express.Multer.File[]) =>
    uploadMediaImages(files, MEDIA_FOLDERS.REPORTER);
 
export const uploadCategoryImages = (files: Express.Multer.File[]) =>
    uploadMediaImages(files, MEDIA_FOLDERS.CATEGORY);
