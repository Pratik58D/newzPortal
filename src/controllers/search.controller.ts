import { Request, Response } from "express";
import NewsArticle from "../models/news.model.js";

export const searchArticles = async (req: Request, res: Response) => {
  try {
    const {
      q,
      category,
      province,
      lang = "np",
      page = "1",
      limit = "10",
    } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ message: "Search query 'q' is required" });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, any> = {
      $text: { $search: q },
      status: "approved",
      publishedAt: { $exists: true, $ne: null },
    };

    if (category && typeof category === "string") {
      filter.category = category;
    }

    if (province && typeof province === "string") {
      filter.province = province;
    }

    const [articles, total] = await Promise.all([
      NewsArticle.find(filter, { score: { $meta: "textScore" } })
        .select(
          `slug category subCategory province media publishedAt views ${
            lang === "en" ? "content.en" : "content.np"
          }`
        )
        .populate("category", "name slug")
        .populate("subCategory", "name slug")
        .sort({ score: { $meta: "textScore" } })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      NewsArticle.countDocuments(filter),
    ]);

    return res.json({
      data: articles,
      meta: {
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};