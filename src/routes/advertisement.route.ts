import express from "express";

import {
  createAdvertisement,
  getAdvertisements,
  getAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getActiveAdvertisements,
  getAdvertisementSlots,
} from "../controllers/advertisement.controller.js";

import { adUpload } from "../middleware/multer.js";
import { authMiddleware, isSuperAdmin, role } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createAdvertisementSchema,
  updateAdvertisementSchema,
} from "../validation/advertisement.validation.js";

const router = express.Router();

// Desktop creative + optional smaller-screen creative.
const adImages = adUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "mobileImage", maxCount: 1 },
]);

// Public (declared before "/:id" so these paths are not read as ids)
router.get("/active", getActiveAdvertisements);
router.get("/slots", getAdvertisementSlots);

// Admin
// Managing ads is limited to admin and superadmin.
router.get("/", authMiddleware, role, getAdvertisements);
router.get("/:id", authMiddleware, role, getAdvertisement);

router.post(
  "/",
  authMiddleware,
  role,
  adImages,
  validate(createAdvertisementSchema),
  createAdvertisement
);

router.patch(
  "/:id",
  authMiddleware,
  role,
  adImages,
  validate(updateAdvertisementSchema),
  updateAdvertisement
);

router.delete("/:id",authMiddleware,isSuperAdmin,deleteAdvertisement);

export default router;
