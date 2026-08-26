/**
 * A file as it comes back from ANY storage backend (Cloudinary, S3, etc).
 * `provider` is stored alongside url/key so that an image keeps knowing
 * which backend it actually lives on, even after you migrate providers.
 */
export interface StorageFile {
  url: string;
  key: string; // provider-specific identifier (Cloudinary public_id, S3 object key, ...)
}

/**
 * Anything that can store and remove files implements this.
 * Business logic (media.service.ts, controllers) should only ever
 * talk to this interface, never to a specific SDK.
 */
export interface StorageProvider {
  readonly name: string;
  upload(files: Express.Multer.File[], folder: string): Promise<StorageFile[]>;
  delete(keys: string[]): Promise<void>;
}