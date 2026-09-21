import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";

// Use memory storage so files are stored in buffer, not disk
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Accept only images
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

export default upload;

// News create/update accepts an "images" field (image files only) and a
// "video" field (video files only, for self-hosted video mode) side by
// side — needs its own fileFilter/limit since video files are larger and
// the per-field mimetype rules differ.
const newsMediaFileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.fieldname === "video") {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed for the video field!"));
    }
    return;
  }

  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

export const uploadNewsMedia = multer({
  storage,
  fileFilter: newsMediaFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit (covers uploaded video)
  },
});
