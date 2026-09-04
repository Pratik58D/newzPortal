import express from "express";
import { authMiddleware, role, staffOnly } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.js";
import {
  createNews,
  deleteNews,
  getLatestNewsByCategory,
  getManageNews,
  getNews,
  getNewsBySlug,
  updateNews,
  updateNewsStatus
} from "../controllers/news.controller.js";

const newsRouter = express.Router();

//staff routes

newsRouter.post("/", authMiddleware, staffOnly, upload.array("images", 5), createNews);

// Update content
newsRouter.put("/:id", authMiddleware, staffOnly, upload.array("images", 5), updateNews);

//update news status
newsRouter.patch("/:id/status", authMiddleware, staffOnly, updateNewsStatus);

//delete news
newsRouter.delete("/:id", authMiddleware, staffOnly, deleteNews);

// Staff management
newsRouter.get("/manage", authMiddleware, staffOnly, getManageNews);

// Public routes
newsRouter.get("/", getNews);
newsRouter.get("/latest-by-category", getLatestNewsByCategory);
newsRouter.get("/:slug", getNewsBySlug);

export default newsRouter;
