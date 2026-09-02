import cloudinary from "../config/cloudinary.js";

export interface UploadImage {
  url: string;
  key: string;
}

export const uploadToCloudinary = async (
  files: Express.Multer.File[],
  folder:string
): Promise<UploadImage[]> => {
   
  const results = await Promise.all(
    files.map((file) => {
      return new Promise<UploadImage>((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
          { folder },
          (error, result) => {
            if (error) return reject(error);
            if (!result) {
              return reject(new Error("Cloudinary upload failed"));
            }

            resolve({
              url: result!.secure_url,
              key: result!.public_id
            });
          }
        );
        stream.end(file.buffer);
      });
    })
  );

  return results; // array of image URLs
};


export const deleteFromCloudinary = async(
  keys :string[]
):Promise<void> => {
  await Promise.all(
    keys.map((key) => cloudinary.uploader.destroy(key))
  )
}