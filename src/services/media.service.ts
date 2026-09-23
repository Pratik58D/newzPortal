import { ApiError } from "../utils/ApiError.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/imageHandling.js";
import { getStorageProvider } from "../utils/provider/storageProvider.factory.js";
import cloudinary from "../config/cloudinary.js";

export const MEDIA_FOLDERS = {
    NEWS: "news-images",
    REPORTER: "reporter-images",
    CATEGORY: "category-images",
    ADVERTISEMENT: "advertisement-images",
    SITE: "site-images",
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

// Self-hosted ("s3"-tagged, actually Cloudinary today — see media.model.ts)
// video upload/delete. Not routed through StorageProvider since that
// interface is image-shaped (no resource_type); kept isolated here so
// swapping storage providers for images doesn't have to account for video.
export const uploadNewsVideo = async (
    file: Express.Multer.File
): Promise<MediaImage> => {
    try {
        return await new Promise<MediaImage>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: MEDIA_FOLDERS.NEWS, resource_type: "video" },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error("Cloudinary video upload failed"));

                    resolve({ url: result.secure_url, key: result.public_id });
                }
            );
            stream.end(file.buffer);
        });
    } catch (error) {
        throw new ApiError(500, "Failed to upload news video", error);
    }
};

export const deleteNewsVideo = async (key: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(key, { resource_type: "video" });
    } catch (error) {
        throw new ApiError(500, "Failed to delete news video", error);
    }
};
 
export const updateNewsImages = (
    existingImages: MediaImage[],
    keptKeys: string[],
    newFiles: Express.Multer.File[]
) => updateMediaImages(existingImages, keptKeys, newFiles, MEDIA_FOLDERS.NEWS);
 
export const uploadReporterImages = (files: Express.Multer.File[]) =>
    uploadMediaImages(files, MEDIA_FOLDERS.REPORTER);
 
export const uploadCategoryImages = (files: Express.Multer.File[]) =>
    uploadMediaImages(files, MEDIA_FOLDERS.CATEGORY);



export const uploadAdvertisementImages = (
  files: Express.Multer.File[]
) =>
  uploadMediaImages(
    files,
    MEDIA_FOLDERS.ADVERTISEMENT
);

  export const deleteAdvertisementImages = deleteMediaImages;