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
  const existingNepali = await Category.findOne({
    "name.np": name.np
  });

  if (existingNepali) {
    return res.status(409).json({ message: "Category with this Nepali name already exists" });
  }

  if (name.en?.trim()) {
    const existingEnglish = await Category.findOne({
      "name.en": name.en.trim(),
    });

    if (existingEnglish) {
      return res.status(409).json({
        message: "Category with this English name already exists",
      });
    }
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

// Delete category or sub category(admin only)
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      message: "Category not found" 
    });
  }

  //check it this category has subcategories, if yes then do not delete it
  const childCount = await Category.countDocuments({ 
    parent: category._id 
  });

  if (childCount > 0) {
    return res.status(409).json({
      message: "Cannot delete a category that has subcategories. Delete or reassign them first.",
    });
  }
  // news articles referencing this category (or its subcategories) are not checked here.
  const newsQuery = category.parent
    ? { subCategory: category._id }
    : { category: category._id };

  const newsCount = await newsModel.countDocuments(newsQuery);

   if (newsCount > 0) {
    return res.status(409).json({
      message:
        "Cannot delete this category because news articles are using it. Reassign or remove the category from those articles first.",
    });
  }

  await Category.findByIdAndDelete(category._id);
  res.json({ success: true, message: "Category deleted" });
});

//update category or subcategory
export const updateCategory = asyncHandler(async(req,res)=>{

  const {id} = req.params;
  const {name,parent} = req.body;

  const category = await Category.findById(id);

  if(!category){
    return res.status(404).json({message:"Category not found"});
  }

  //validate name
  if(name?.np?.trim()){
    return res.status(400).json({message:"Nepali name is required"});
  }

  const nepaliName = name.np.trim();
  const englishName = name.en?.trim() || "";

  //check for duplicate Nepali names

  const existingNepali = await Category.findOne({
    "name.np": nepaliName,
    _id: { $ne: category._id },
  });

  if (existingNepali) {
    return res.status(409).json({
      message: "Category with this Nepali name already exists",
    });
  }

  // Check duplicate English name only if provided
  if (englishName) {
    const existingEnglish = await Category.findOne({
      "name.en": englishName,
      _id: { $ne: category._id },
    });

    if (existingEnglish) {
      return res.status(409).json({
        message: "Category with this English name already exists",
      });
    }
  }


  // Validate parent category
  let newParent = null;

  if (parent) {
    // Cannot make itself its own parent
    if (parent.toString() === category._id.toString()) {
      return res.status(400).json({
        message: "A category cannot be its own parent",
      });
    }
 const parentDoc = await Category.findById(parent);

    if (!parentDoc) {
      return res.status(404).json({
        message: "Parent category not found",
      });
    }

     // Parent itself must be a top-level category
    if (parentDoc.parent) {
      return res.status(400).json({
        message: "A subcategory cannot have another subcategory as its parent",
      });
    }

    newParent = parentDoc._id;
  }

    // Generate new slug

  const slug = generateSlug(
    englishName,
    nepaliName,
    "category"
  );

  // Update
   category.name = {
    np: nepaliName,
    en: englishName,
  };

  category.slug = slug;
  category.parent = newParent;

  await category.save();

    res.json({
    success: true,
    message: "Category updated successfully",
    data: category,
  });
  
})

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
          select: "userId commentText createdAt",
          populate: { path: "userId", select: "name" },
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


