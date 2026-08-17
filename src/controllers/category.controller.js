import slugify from "slugify";
import Category from "../models/category.model.js";
import newsModel from "../models/news.model.js";
import { paginate } from "../utilies/paginate.js";
import { asyncHandler } from "../utilies/asyncHandler.js";

// Create new category
export const createCategory = asyncHandler(async (req, res) => {
  const { name, province } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }
  const existing = await Category.findOne({ name });
  if (existing) {
    return res.status(409).json({ message: "Category already exists" });
  }
  const slug = slugify(name, { lower: true, strict: true });

  const newCategory = new Category({
    name,
    slug,
    province: province || null,
  });
  await newCategory.save();
  res.status(201).json({ success: true, data: newCategory });
});

// Delete category (admin only)
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Category.findByIdAndDelete(id);
  res.json({ success: true, message: "Category deleted" });
});

// Get all categories
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  res.json({ success: true, categories });
});

// Get single category by slug
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug });

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.json({ success: true, category });
});

//searching and sorting categories
export const searchCategories = asyncHandler(async (req, res) => {
    const { search, province, page = 1, limit = 10 } = req.query;

    const query = {};

    // serching with resect to name , slug or province
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { slug: regex }];
    }

    // Filter directly by province if provided separately
    if (province) {
      query.province = province.toLowerCase();
    }

    // Paginate categories
    const categoriesPaginated = await paginate(Category, query, {
      page,
      limit,
      sort: { name: 1 },
    });

    // Fetch top 5 news for each category + + populate comments for each category's news

    const categoriesWithNews = await Promise.all(
      categoriesPaginated.data.map(async (cat) => {
        const news = await newsModel
          .find({ category: cat._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("title description slug images date")
          .populate({
            path: "comments",
            // match: { status: "approved" },    // only approved comments
            select: "username commentText createdAt",
            options: { sort: { createdAt: -1 } },
          });

        return {
          ...cat.toObject(),
          news,
        };
      })
    );

  res.json({
    success: true,
    page: categoriesPaginated.page,
    totalPages: categoriesPaginated.totalPages,
    totalCategories: categoriesPaginated.totalItems,
    data: categoriesWithNews,
  });
});
