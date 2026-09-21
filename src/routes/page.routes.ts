import express from "express";

import {
  createPage,
  deletePage,
  getPageBySlug,
  getPages,
  managePages,
  updatePage,
} from "../controllers/page.controller.js";
import { authMiddleware, role } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createPageSchema, updatePageSchema } from "../validation/page.validation.js";

const router = express.Router();

// Admin / superadmin (declared before "/:slug" so "manage" isn't read as a slug)
router.get("/manage", authMiddleware, role, managePages);
router.post("/", authMiddleware, role, validate(createPageSchema), createPage);
router.put("/:id", authMiddleware, role, validate(updatePageSchema), updatePage);
router.delete("/:id", authMiddleware, role, deletePage);

// Public: published pages only
router.get("/", getPages);
router.get("/:slug", getPageBySlug);

export default router;
