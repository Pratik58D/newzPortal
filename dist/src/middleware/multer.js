import multer from "multer";
// Use memory storage so files are stored in buffer, not disk
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    }
    else {
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
//# sourceMappingURL=multer.js.map