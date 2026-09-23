// routes/categoryRoutes.ts
import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  getSubcategories,
  deleteCategory,
  searchCategories,
  updateCategory,
} from "../controllers/category.controller.js";

import { authMiddleware, role } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createCategorySchema, updateCategorySchema } from "../validation/category.validation.js";

const categoryRouter = express.Router();

// 🌍 Public routes
categoryRouter.get("/", getAllCategories);
categoryRouter.get("/search", searchCategories);
categoryRouter.get("/:slug/subcategories", getSubcategories);
categoryRouter.get("/:slug", getCategoryBySlug);

// 🔐 Admin-only routes
categoryRouter.post("/", authMiddleware, role, validate(createCategorySchema), createCategory);
categoryRouter.put("/:id", authMiddleware, role, validate(updateCategorySchema), updateCategory);
categoryRouter.delete("/:id", authMiddleware, role, deleteCategory);

export default categoryRouter;
