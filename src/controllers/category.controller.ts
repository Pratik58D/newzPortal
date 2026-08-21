import Category from "../models/category.model.js";
import newsModel from "../models/news.model.js";
import { paginate } from "../utils/paginate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateSlug } from "../utils/generateSlug.js";

// Create new category
export const createCategory = asyncHandler(async (req, res) => {
  const { name, parent } = req.body;
  if (!name?.np) {
    return res.status(400).json({ message: "Category name (Nepali) is required" });
  }
  const existing = await Category.findOne({ "name.np": name.np });
  if (existing) {
    return res.status(409).json({ message: "Category already exists" });
  }

  if (parent) {
    const parentDoc = await Category.findById(parent);
    if (!parentDoc) {
      return res.status(404).json({ message: "Parent category not found" });
    }
    if (parentDoc.parent) {
      return res.status(400).json({
        message: "Subcategories cannot have their own subcategories",
      });
    }
  }

  const slug = generateSlug(name.en, name.np, "category");

  const newCategory = new Category({
    name: { np: name.np, en: name.en || "" },
    slug,
    parent: parent || null,
  });
  await newCategory.save();
  res.status(201).json({ success: true, data: newCategory });
});

// Delete category (admin only)
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const childCount = await Category.countDocuments({ parent: id });
  if (childCount > 0) {
    return res.status(409).json({
      message: "Cannot delete a category that has subcategories. Delete or reassign them first.",
    });
  }
  // TODO: news articles referencing this category (or its subcategories) are not checked here.

  await Category.findByIdAndDelete(id);
  res.json({ success: true, message: "Category deleted" });
});

// Get all categories (defaults to top-level only; ?parent=<id> for children, ?parent=all for everything)
export const getAllCategories = asyncHandler(async (req, res) => {
  const { parent } = req.query;

  const query: Record<string, unknown> = {};
  if (!parent) {
    query.parent = null;
  } else if (parent !== "all") {
    query.parent = parent;
  }

  const categories = await Category.find(query).sort({ createdAt: -1 });
  res.json({ success: true, categories });
});

// Get subcategories of a category by slug
export const getSubcategories = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const parentDoc = await Category.findOne({ slug });
  if (!parentDoc) {
    return res.status(404).json({ message: "Category not found" });
  }

  const subcategories = await Category.find({ parent: parentDoc._id }).sort({ "name.np": 1 });
  res.json({ success: true, parent: parentDoc, subcategories });
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
  const { search, page = 1, limit = 10 } = req.query;

  const query: Record<string, unknown> = {};

  // serching with resect to name (either language) or slug
  if (search) {
    const regex = new RegExp(String(search), "i");
    query.$or = [{ "name.np": regex }, { "name.en": regex }, { slug: regex }];
  }

  // Paginate categories
  const categoriesPaginated = await paginate(Category, query, {
    page: page as string,
    limit: limit as string,
    sort: { "name.np": 1 },
  });

  // Fetch top 5 news for each category + + populate comments for each category's news

  const categoriesWithNews = await Promise.all(
    categoriesPaginated.data.map(async (cat) => {
      const newsQuery = cat.parent
        ? { subCategory: cat._id, status: "approved" }
        : { category: cat._id, status: "approved" };

      const news = await newsModel
        .find(newsQuery)
        .sort({ publishedAt: -1 })
        .limit(5)
        .select("content slug media publishedAt")
        .populate({
          path: "comments",
          // match: { status: "approved" },    // only approved comments
          select: "username commentText createdAt",
          options: { sort: { createdAt: -1 } },
        });

      return {
        ...cat.toObject(),
        isSubcategory: !!cat.parent,
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
