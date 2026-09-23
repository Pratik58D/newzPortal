import express from "express";

import {
  getSiteSettings,
  updateSiteSettings,
  uploadSiteLogo,
  deleteSiteLogo,
} from "../controllers/siteSettings.controller.js";

import upload from "../middleware/multer.js";
import { authMiddleware, isSuperAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateSiteSettingsSchema } from "../validation/siteSettings.validation.js";

const router = express.Router();

// Public
router.get("/", getSiteSettings);

// Superadmin only
router.put(
  "/",
  authMiddleware,
  isSuperAdmin,
  validate(updateSiteSettingsSchema),
  updateSiteSettings,
);

router.put(
  "/logo",
  authMiddleware,
  isSuperAdmin,
  upload.single("logo"),
  uploadSiteLogo,
);

router.delete("/logo", authMiddleware, isSuperAdmin, deleteSiteLogo);

export default router;
