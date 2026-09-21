import express from "express";

import {
  getHomepage,
  manageHomepage,
  updateHomepage,
} from "../controllers/homepage.controller.js";

import { authMiddleware, role } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateHomepageSchema } from "../validation/homepage.validation.js";

const router = express.Router();

// Public: enabled sections only
router.get("/", getHomepage);

// Admin / superadmin
router.get("/manage", authMiddleware, role, manageHomepage);
router.put(
  "/",
  authMiddleware,
  role,
  validate(updateHomepageSchema),
  updateHomepage,
);

export default router;
