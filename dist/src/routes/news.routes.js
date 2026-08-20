import express from "express";
import { authMiddleware, role, staffOnly } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.js";
import { approveNews, createNews, deleteNews, getManageNews, getNews, getNewsBySlug, rejectNews, submitNews, updateNews, } from "../controllers/news.controller.js";
const newsRouter = express.Router();
//staff routes
newsRouter.post("/create", authMiddleware, staffOnly, upload.array("images", 5), createNews);
newsRouter.put("/update/:id", authMiddleware, staffOnly, upload.array("images", 5), updateNews);
newsRouter.delete("/delete/:id", authMiddleware, role, deleteNews);
newsRouter.patch("/submit/:id", authMiddleware, staffOnly, submitNews);
newsRouter.patch("/approve/:id", authMiddleware, role, approveNews);
newsRouter.patch("/reject/:id", authMiddleware, role, rejectNews);
newsRouter.get("/manage", authMiddleware, staffOnly, getManageNews);
//pubilic routes
newsRouter.get("/", getNews);
newsRouter.get("/:slug", getNewsBySlug);
export default newsRouter;
//# sourceMappingURL=news.routes.js.map