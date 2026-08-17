import newsModel from "../models/news.model.js";
import slugify from "slugify";
import {
  extractPublicId,
  uploadToCloudinary,
} from "../utilies/imageHandling.js";
import { paginate } from "../utilies/paginate.js";
import Category from "../models/category.model.js";

// Staff (editor/admin/superadmin): CREATE
// - editor-created articles start as "draft" and go through review
// - admin/superadmin-created articles are auto-approved

export const createNews = async (req, res) => {
  try {
    const { title, category, description, date } = req.body;
    const files = req.files;
    if (!title || !category || !date || !files?.length) {
      return res
        .status(400)
        .json({ message: "Missing required fields or images." });
    }
    let slug = slugify(title, { lower: true, strict: true });

    console.log(slug);

    const exists = await newsModel.findOne({ slug });
    console.log(exists);

    if (exists) slug += "-" + Date.now();
    console.log(slug);

    const imageUrls = await uploadToCloudinary(files);
    const isSelfPublisher = ["admin", "superadmin"].includes(req.user.role);
    const news = new newsModel({
      title,
      slug,
      category,
      author: req.user.id,
      media: { type: "image", images: imageUrls },
      description,
      date,
      status: isSelfPublisher ? "approved" : "draft",
    });
    await news.save();
    res
      .status(201)
      .json({ success: true, message: "News created", data: news });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//  Staff: UPDATE
// editors may only edit their own draft/rejected articles; admin/superadmin may edit anything
export const updateNews = async (req, res) => {
  try {
    const existingNews = await newsModel.findById(req.params.id);
    if (!existingNews) {
      return res.status(404).json({ message: "News not found" });
    }

    if (req.user.role === "editor") {
      const isOwner = existingNews.author?.equals(req.user.id);
      const isEditable = ["draft", "rejected"].includes(existingNews.status);
      if (!isOwner || !isEditable) {
        return res.status(403).json({
          message: "You can only edit your own draft or rejected articles",
        });
      }
    }

    const { title, category, description, date, status } = req.body;
    const updateFields = { title, category, description, date, status };

    if (title) {
      let slug = slugify(title, { lower: true, strict: true });
      const exists = await newsModel.findOne({
        slug,
        _id: { $ne: req.params.id },
      });
      if (exists) slug += "-" + Date.now();
      updateFields.slug = slug;
    }

    if (category) {
      const categoryDoc = await Category.findOne({ name: category.trim() });
      if (!categoryDoc) {
        return res.status(404).json({ message: "Category not found" });
      }
      updateFields.category = categoryDoc._id;
    }

    const files = req.files;
    if (files && files.length > 0) {
      const imageUrls = await uploadToCloudinary(files);
      updateFields.media = { type: "image", images: imageUrls };
    }

    const updatedNews = await newsModel.findByIdAndUpdate(
      req.params.id,
      updateFields,
      {
        new: true,
      }
    );

    res.json({ success: true, data: updatedNews });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// Editor (author only) / admin / superadmin: submit a draft or rejected article for review
export const submitNews = async (req, res) => {
  try {
    const news = await newsModel.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    const isOwner = news.author?.equals(req.user.id);
    const isSelfPublisher = ["admin", "superadmin"].includes(req.user.role);
    if (!isOwner && !isSelfPublisher) {
      return res.status(403).json({ message: "You can only submit your own articles" });
    }

    if (!["draft", "rejected"].includes(news.status)) {
      return res
        .status(400)
        .json({ message: "Only draft or rejected articles can be submitted" });
    }

    news.status = "pending";
    news.rejectionReason = undefined;
    await news.save();

    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ message: "Submit failed", error: error.message });
  }
};

// Admin/superadmin: approve a pending article
export const approveNews = async (req, res) => {
  try {
    const news = await newsModel.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }
    if (news.status !== "pending") {
      return res.status(400).json({ message: "Only pending articles can be approved" });
    }

    news.status = "approved";
    news.rejectionReason = undefined;
    await news.save();

    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ message: "Approve failed", error: error.message });
  }
};

// Admin/superadmin: reject a pending article, optionally with a reason
export const rejectNews = async (req, res) => {
  try {
    const news = await newsModel.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }
    if (news.status !== "pending") {
      return res.status(400).json({ message: "Only pending articles can be rejected" });
    }

    news.status = "rejected";
    news.rejectionReason = req.body.rejectionReason || undefined;
    await news.save();

    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ message: "Reject failed", error: error.message });
  }
};

// Staff: moderation queue / "my articles" view - any status, filtered by ownership for editors
export const getManageNews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (req.user.role === "editor") {
      query.author = req.user.id;
    }
    if (status) {
      query.status = status;
    }

    const result = await paginate(newsModel, query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "category", select: "name slug" },
        { path: "author", select: "name email role" },
      ],
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ message: "Failed to get news", error: error.message });
  }
};

// admin :delete
export const deleteNews = async (req, res) => {
  try {
    const newsId = req.params.id;

    // Check if the news exists
    const news = await newsModel.findById(newsId);
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    //  Delete images from Cloudinary if stored there
    // You would need to store Cloudinary public_ids in your news.images array for this

    for (const imageUrl of news.media?.images || []) {
      const publicId = extractPublicId(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    }

    await newsModel.findByIdAndDelete(newsId);

    res.json({ success: true, message: "News deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

//public :Get paginated news with comments and category

export const getNews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = { status: "approved" }; // only approved news is public
    const skip = (page - 1) * limit;

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ title: regex }, { description: regex }, { slug: regex }];
    }

    // Parallel queries: get news + total count
    const [newsList, total] = await Promise.all([
      newsModel
        .find(query)
        .sort({ date: -1 }) // latest news first
        .skip(skip)
        .limit(limit)
        .populate("category", "name slug")
        .populate({
          path: "comments",
          select: "username commentText createdAt",
          options: { sort: { createdAt: -1 } },
        })
        .lean(), // plain JS objects for performance
      newsModel.countDocuments(query),
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: newsList,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to get news", error: error.message });
  }
};

//  Get one news article by slug (with category and comments)
export const getNewsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const news = await newsModel
      .findOne({ slug, status: "approved" })
      .populate("category", "name slug")
      .populate({
        path: "comments",
        select: "username commentText createdAt",
        options: { sort: { createdAt: -1 } },
      })
      .lean();

    if (!news) {
      return res.status(404).json({ message: "News article not found" });
    }

    return res.json({ success: true, data: news });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to get news article", error: error.message });
  }
};
