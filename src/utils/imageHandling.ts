import cloudinary from "../config/cloudinary.js";

export const uploadToCloudinary = async (files: Express.Multer.File[]): Promise<string[]> => {
  const results = await Promise.all(
    files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "news-images" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result!.secure_url); // Only save URL
          }
        );
        stream.end(file.buffer);
      });
    })
  );

  return results; // array of image URLs
};

//extract public Id for deletion

export const extractPublicId = (url: string): string | null => {
  try {
    // https://res.cloudinary.com/demo/image/upload/v1690909090/foldername/filename.jpg
    // We need: foldername/filename (without extension)

    const parts = url.split("/");
    const fileWithExt = parts.pop()!; // filename.jpg
    const publicId = fileWithExt.substring(0, fileWithExt.lastIndexOf(".")); // filename

    // If the image is in a folder, keep the folder path

    const folderPath = parts.slice(parts.indexOf("upload") + 1).join("/");

    return `${folderPath}/${publicId}`;
  } catch (err) {
    console.error("Failed to extract public_id from URL:", (err as Error).message);
    return null;
  }
};
