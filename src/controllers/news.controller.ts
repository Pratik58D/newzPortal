import newsModel from "../models/news.model.js";
import type { ProvinceCode } from "../constants/provinces.js";
import {
  extractPublicId,
  uploadToCloudinary,
} from "../utils/imageHandling.js";
import { paginate } from "../utils/paginate.js";
import Category from "../models/category.model.js";
import cloudinary from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateSlug } from "../utils/generateSlug.js";
import Reporter from "../models/reporter.model.js";
import {uploadNewsImages , deleteNewsImages} from "../services/media.service.js";

// Staff (editor/admin/superadmin): CREATE
// - editor-created articles start as "draft" and go through review
// - admin/superadmin-created articles are auto-approved

export const createNews = asyncHandler(async (req, res) => {
  const {
    titleNp, summaryNp, bodyNp,
    titleEn, summaryEn, bodyEn,
    category,
    subCategory,
    province,
    reporter,
    authorType = 'reporter'
  } = req.body;

  const files = (req.files ?? []) as Express.Multer.File[];

  if (!titleNp || !category) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Missing required fields: titleNp and category are required"
      });
  }

  // Validate authorType
  if (!["reporter", "editor"].includes(authorType)) {
    return res.status(400).json({
      success: false,
      message: "authorType must be either reporter or editor",
    });
  }

  // If reporter is selected as author, reporter must be provided
  if (authorType === "reporter" && !reporter) {
    return res.status(400).json({
      success: false,
      message: "Reporter is required when authorType is reporter",
    });
  }

  // Validate category
  const categoryDoc = await Category.findById(category);

  if (!categoryDoc) {
    return res.status(404).json({
      success: false,
      message: "Category not found"
    });
  }

  // Validate subcategory
  if (subCategory) {
    const subCategoryDoc = await Category.findById(subCategory);

    if (!subCategoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found"
      });
    }

    if (subCategoryDoc.parent?.toString() !== category) {
      return res.status(400).json({
        success: false,
        message: "Subcategory does not belong to the selected category"
      });
    }
  }

  // Validate reporter
  if (reporter) {
    const reporterDoc = await Reporter.findOne({
      _id: reporter,
      isActive: true,
    });

    if (!reporterDoc) {
      return res.status(404).json({
        success: false,
        message: "Reporter not found or inactive",
      });
    }
  }

  //generate slug from title, ensuring uniqueness
  let slug = generateSlug(titleEn, titleNp, "news");

  const exists = await newsModel.findOne({ slug });

  if (exists) slug += "-" + Date.now();

  // Upload images
  const imageUrls = await uploadNewsImages(files)

  const news = new newsModel({
    slug,
    category,
    subCategory: subCategory || undefined,

    // Logged-in CMS user
    editor: req.user!.id,
    // Field reporter
    reporter: reporter || undefined,
    // Who should appear publicly as author
    authorType,

    province: (province as ProvinceCode) || undefined,

    media: {
      type: "image",
      images: imageUrls
    },

    content: {
      np: {
        title: titleNp,
        summary: summaryNp || "",
        body: bodyNp || ""
      },

      en: {
        title: titleEn || "",
        summary: summaryEn || "",
        body: bodyEn || ""
      },
    },
    status: "draft",
  });

  await news.save();

  res.status(201).json({
    success: true,
    message: "News created",
    data: news
  });
});

//  Staff: UPDATE news content, category, subcategory, province, date, and images
// editors may only edit their own draft/rejected articles.
//  admin/superadmin may edit anything

export const updateNews = asyncHandler(async (req, res) => {

  const existingNews = await newsModel.findById(req.params.id);

  if (!existingNews) {
    return res.status(404).json({ success: false, message: "News not found" });
  }

  // Editors can only edit their own draft or rejected articles
  if (req.user!.role === "editor") {
    const isOwner = existingNews.editor?.equals(req.user!.id);
    const isEditable = ["draft", "rejected"].includes(existingNews.status);

    if (!isOwner || !isEditable) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own draft or rejected articles",
      });
    }
  }

  const {
    titleNp, summaryNp, bodyNp,
    titleEn, summaryEn, bodyEn,
    category, subCategory, province,
    reporter, authorType
  } = req.body;

  const updateFields: Record<string, unknown> = {};

  //province
  if (province !== undefined) {
    updateFields.province = province || undefined;
  }

  //content
  const titleChanged =
    titleNp !== undefined ||
    titleEn !== undefined;

  const contentChanged =
    titleNp !== undefined ||
    summaryNp !== undefined ||
    bodyNp !== undefined ||
    titleEn !== undefined ||
    summaryEn !== undefined ||
    bodyEn !== undefined;


  if (contentChanged) {
    const updatedContent = {
      np: {
        title: titleNp ?? existingNews.content.np.title,
        summary: summaryNp ?? existingNews.content.np.summary,
        body: bodyNp ?? existingNews.content.np.body,
      },
      en: {
        title: titleEn ?? existingNews.content.en.title,
        summary: summaryEn ?? existingNews.content.en.summary,
        body: bodyEn ?? existingNews.content.en.body,
      },
    };

    updateFields.content = updatedContent;

    // Only generate a new slug if the title changed

    if (titleChanged) {
      const newSlug = generateSlug(
        updatedContent.en.title,
        updatedContent.np.title,
        "news"
      );

      // Check whether another article already uses this slug
      const existingSlug = await newsModel.findOne({
        slug: newSlug,
        _id: { $ne: req.params.id },
      });

      updateFields.slug = existingSlug
        ? `${newSlug}-${Date.now()}`
        : newSlug;
    }
  }

  //category and subcategory

  if (category) {
    const categoryDoc = await Category.findById(category);

    if (!categoryDoc) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    updateFields.category = categoryDoc._id;


    // If subcategory was also provided, validate it
    if (subCategory !== undefined) {
      if (!subCategory) {
        updateFields.subCategory = null;
      } else {
        const subCategoryDoc = await Category.findById(subCategory);
        if (!subCategoryDoc) {
          return res.status(404).json({
            success: false,
            message: "Subcategory not found",
          });
        }
        if (subCategoryDoc.parent?.toString() !== category) {
          return res.status(400).json({
            success: false,
            message: "Subcategory does not belong to the selected category",
          });
        }

        updateFields.subCategory = subCategoryDoc._id;
      }
    } else if (existingNews.subCategory) {
      // Category changed but no subcategory was provided.
      // Make sure the old subcategory still belongs to the new category.
      const currentSubCategory = await Category.findById(existingNews.subCategory);
      if (
        currentSubCategory?.parent?.toString() !== category
      ) {
        updateFields.subCategory = null;
      }
    }
  }

  //subcategory only

  else if (subCategory !== undefined) {
    if (!subCategory) {
      updateFields.subCategory = null;
    } else {
      const subCategoryDoc = await Category.findById(subCategory);

      if (!subCategoryDoc) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found",
        });
      }

      if (
        subCategoryDoc.parent?.toString() !==
        existingNews.category.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Subcategory does not belong to the selected category",
        });
      }
      updateFields.subCategory = subCategoryDoc._id;
    }
  }

  // Author / repoter

  if (authorType !== undefined) {
    if (!["reporter", "editor"].includes(authorType)) {
      return res.status(400).json({
        success: false,
        message: "authorType must be either reporter or editor",
      });
    }
    updateFields.authorType = authorType;

    if (authorType === "reporter") {
      if (!reporter && !existingNews.reporter) {
        return res.status(400).json({
          success: false,
          message: "Reporter is required when authorType is reporter",
        });
      }

      if (reporter) {
        const reporterDoc = await Reporter.findOne({
          _id: reporter,
          isActive: true,
        });

        if (!reporterDoc) {
          return res.status(404).json({
            success: false,
            message: "Reporter not found or inactive",
          });
        }

        updateFields.reporter = reporterDoc._id;
      }
    }
    if (authorType === "editor") {
      updateFields.reporter = undefined;
    }
  }



  //images
  const files = req.files as Express.Multer.File[] | undefined;

  if (files && files.length > 0) {
    try {
      const images = await uploadToCloudinary(files);

      updateFields.media = {
        type: "image",
        images
      };
    } catch (error) {
      throw new ApiError(500, "Failed to upload images", error);
    }
  }

  //update article
  const updatedNews = await newsModel.findByIdAndUpdate(
    req.params.id,
    updateFields,
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({ success: true, message: "News updated successfully", data: updatedNews });
});

//update news status 
export const updateNewsStatus = asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;

  const news = await newsModel.findById(req.params.id);

  console.log({ news })

  if (!news) {
    return res.status(404).json({
      success: false,
      message: "News not found"
    });
  }

  const currentStatus = news.status;
  const userRole = req.user!.role;
  const isAdmin = ["admin", "superadmin"].includes(userRole);
  const isEditor = userRole === "editor";
  const isOwner = news.editor?.equals(req.user!.id);

  //validate requested status
  const allowedStatuses = [
    "draft",
    "pending",
    "approved",
    "rejected"
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status"
    });
  }

  // Editors can only submit their own draft/rejected articles for review
  if (isEditor) {
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own articles"
      });
    }

    const canSubmit = (
      (currentStatus === "draft" && status === "pending") ||
      (currentStatus === "rejected" && status === "pending")
    )

    if (!canSubmit) {
      return res.status(400).json({
        success: false,
        message: "Editors can only submit draft or rejected articles for review"
      });
    }
  }

  //admin/superadmin can approve/reject any article, 

  if (isAdmin) {
    if (currentStatus !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending articles can be approved or rejected" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Admins can only approve or reject pending articles" });
    }
  }

  //save rejection reason when rejecting
  if (status === "rejected") {
    news.rejectionReason = rejectionReason || undefined;
  } else {
    news.rejectionReason = undefined;
  }

  //approval
  if (status === "approved") {
    news.publishedAt = new Date();
  }

  news.status = status;
  await news.save();

  return res.status(200).json({
    success: true,
    message: `News status changed from ${currentStatus} to ${status}`,
    data: news,
  });

});

// Staff: moderation queue / "my articles" view - any status, filtered by ownership for editors
export const getManageNews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, province } = req.query;

  const query: Record<string, unknown> = {};

  //an editor only sees their own articles, while admin/superadmin see everything
  if (req.user!.role === "editor") {
    query.editor = req.user!.id;
  }

  if (status) {
    query.status = status;
  }
  if (province) {
    query.province = String(province).toLowerCase();
  }

  const result = await paginate(newsModel, query, {
    page: page as string,
    limit: limit as string,
    sort: { createdAt: -1 },
    populate: [
      { path: "category", select: "name slug" },
      { path: "subCategory", select: "name slug" },
      { path: "editor", select: "name email role" },
      {path:"reporter", select: "name email phone "}
    ],
  });

  res.json({ success: true, ...result });
});


//public :Get paginated news with comments and category
export const getNews = asyncHandler(async (req, res) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 10;
  const search = req.query.search || "";

  //only approved news
  const query: Record<string, unknown> = { status: "approved" }; // only approved news is public

  const skip = (page - 1) * limit;

  if (search) {
    const regex = new RegExp(String(search), "i");
    query.$or = [
      { "content.np.title": regex },
      { "content.np.body": regex },
      { "content.en.title": regex },
      { "content.en.body": regex },
      { slug: regex },
    ];
  }
  if (req.query.province) {
    query.province = String(req.query.province).toLowerCase();
  }

  // Parallel queries: get news + total count
  const [newsList, total] = await Promise.all([
    newsModel
      .find(query)
      .sort({ publishedAt: -1 }) // latest news first
      .skip(skip)
      .limit(limit)
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .populate({
        path: "comments",
        match: { status: "approved" }, // only approved comments are public
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
});

//  Get one news article by slug (with category and comments)
export const getNewsBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const news = await newsModel
    .findOneAndUpdate(
      { slug, status: "approved" },
      { $inc: { views: 1 } },
      { new: true }
    )
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "comments",
      select: "username commentText createdAt",
      options: { sort: { createdAt: -1 } },
    })
    .lean();

  if (!news) {
    return res.status(404).json({
      success: false,
      message: "News article not found"
    });
  }

  return res.json({ success: true, data: news });
});

// admin :delete
export const deleteNews = asyncHandler(async (req, res) => {
  const newsId = req.params.id;

  // Check if the news exists
  const news = await newsModel.findById(newsId);
  if (!news) {
    return res.status(404).json({ message: "News not found" });
  }

  //  Delete images from Cloudinary if stored there
  await deleteNewsImages(news.media?.images || []);

  await newsModel.findByIdAndDelete(newsId);

  res.json({ success: true, message: "News deleted successfully" });
});