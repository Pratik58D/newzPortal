import cloudinary from "../../config/cloudinary.js";
import type { StorageProvider, StorageFile } from "./StorageProvider.js";

class CloudinaryProvider implements StorageProvider {
  readonly name = "cloudinary";

  async upload(files: Express.Multer.File[], folder: string): Promise<StorageFile[]> {
    return Promise.all(
      files.map(
        (file) =>
          new Promise<StorageFile>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder },
              (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error("Cloudinary upload failed"));

                resolve({
                  url: result.secure_url,
                  key: result.public_id,
                });
              }
            );
            stream.end(file.buffer);
          })
      )
    );
  }

  async delete(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await Promise.all(keys.map((key) => cloudinary.uploader.destroy(key)));
  }
}

// Singleton - stateless wrapper around the Cloudinary SDK
export const cloudinaryProvider = new CloudinaryProvider();