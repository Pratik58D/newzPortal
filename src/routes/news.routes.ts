import express from "express";
import { authMiddleware, staffOnly } from "../middleware/auth.middleware.js";
import { uploadNewsMedia } from "../middleware/multer.js";
import {
  createNews,
  deleteNews,
  getLatestNewsByCategory,
  getManageNews,
  getMostViewedNews,
  getNews,
  getNewsBySlug,
  getNewsStats,
  updateNews,
  updateNewsStatus
} from "../controllers/news.controller.js";

const newsRouter = express.Router();

//staff routes

const newsMediaFields = uploadNewsMedia.fields([
  { name: "images", maxCount: 5 },
  { name: "video", maxCount: 1 },
]);

newsRouter.post("/", authMiddleware, staffOnly, newsMediaFields, createNews);

// Update content
newsRouter.put("/:id", authMiddleware, staffOnly, newsMediaFields, updateNews);

//update news status
newsRouter.patch("/:id/status", authMiddleware, staffOnly, updateNewsStatus);

//delete news
newsRouter.delete("/:id", authMiddleware, staffOnly, deleteNews);

// Staff management
newsRouter.get("/manage", authMiddleware, staffOnly, getManageNews);

// Staff dashboard stats
newsRouter.get("/stats", authMiddleware, staffOnly, getNewsStats);

// Public routes
// Public routes

newsRouter.get("/", getNews);

newsRouter.get("/latest-by-category", getLatestNewsByCategory);

newsRouter.get("/most-viewed", getMostViewedNews);

newsRouter.get("/:slug", getNewsBySlug);

export default newsRouter;
