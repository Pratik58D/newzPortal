import { Router } from "express";
import { searchArticles } from "../controllers/search.controller.js";

const router = Router();
router.get("/search", searchArticles);

export default router;