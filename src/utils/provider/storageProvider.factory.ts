import type { StorageProvider } from "./StorageProvider.js";
import { cloudinaryProvider } from "./Cloudinary.provider.js";
// import { s3Provider } from "../providers/s3.provider.js"; // add when it exists

const providers: Record<string, StorageProvider> = {
  cloudinary: cloudinaryProvider,
  // s3: s3Provider,
};

// Whatever provider new uploads should go through. Switch by env var,
// not by editing controllers/services.
const ACTIVE_PROVIDER = process.env.STORAGE_PROVIDER || "cloudinary";

export const getStorageProvider = (): StorageProvider => {
  const provider = providers[ACTIVE_PROVIDER];
  if (!provider) {
    throw new Error(`Unknown storage provider: "${ACTIVE_PROVIDER}"`);
  }
  return provider;
};