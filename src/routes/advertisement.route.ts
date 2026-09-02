import express from "express";

import {
  createAdvertisement,
  getAdvertisements,
  getAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getActiveAdvertisements,
} from "../controllers/advertisement.controller.js";

import upload from "../middleware/multer.js";
import { authMiddleware, isSuperAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/active", getActiveAdvertisements);

// Admin
router.get("/",authMiddleware, getAdvertisements);
router.get("/:id", authMiddleware, getAdvertisement);

router.post("/",authMiddleware,upload.array("image", 1),createAdvertisement);

router.patch("/:id",authMiddleware,upload.array("image", 1),updateAdvertisement);

router.delete("/:id",authMiddleware,isSuperAdmin,deleteAdvertisement);

export default router;