import newsModel from "../models/news.model.js";
import type { ProvinceCode } from "../constants/provinces.js";
import {
  uploadToCloudinary,
} from "../utils/imageHandling.js";

import { paginate } from "../utils/paginate.js";
import Category from "../models/category.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateSlug } from "../utils/generateSlug.js";
import {
  breakingNotExpired,
  parseBreakingUntil,
  resolveNewsSort,
} from "../utils/newsQuery.js";
import Reporter from "../models/reporter.model.js";
import { uploadNewsImages, deleteNewsImages, updateNewsImages, uploadNewsVideo, deleteNewsVideo } from "../services/media.service.js";

type NewsMediaFiles = {
  images?: Express.Multer.File[];
  video?: Express.Multer.File[];
};
import { success } from "zod";

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
    authorType = 'reporter',
    tags,
    isFeatured,
    isBreaking,
    breakingUntil,
    mediaType = "image",
    videoUrl,
    videoProvider,
  } = req.body;

  const parsedBreakingUntil = parseBreakingUntil(breakingUntil);
  if (breakingUntil !== undefined && parsedBreakingUntil === undefined) {
    return res.status(400).json({
      success: false,
      message: "breakingUntil must be a valid date",
    });
  }

  const uploadedFiles = (req.files ?? {}) as NewsMediaFiles;
  const imageFiles = uploadedFiles.images ?? [];
  const videoFile = uploadedFiles.video?.[0];

  if (!["image", "video"].includes(mediaType)) {
    return res.status(400).json({
      success: false,
      message: "mediaType must be either image or video",
    });
  }

  if (mediaType === "video" && !videoFile && !videoUrl) {
    return res.status(400).json({
      success: false,
      message: "Provide a video file or a video URL when mediaType is video",
    });
  }

  if (mediaType === "video" && !videoFile && !["youtube", "vimeo"].includes(videoProvider)) {
    return res.status(400).json({
      success: false,
      message: "videoProvider must be youtube or vimeo when providing a video link",
    });
  }

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

  // Build media block: either an uploaded/kept image set, or a video
  // (self-hosted upload, tagged "s3", or a youtube/vimeo link).
  const media =
    mediaType === "video"
      ? videoFile
        ? { type: "video" as const, video: { ...(await uploadNewsVideo(videoFile)), provider: "s3" as const } }
        : { type: "video" as const, video: { url: videoUrl, provider: videoProvider as "youtube" | "vimeo" } }
      : { type: "image" as const, images: await uploadNewsImages(imageFiles) };

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

    media,

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
    tags: tags ? JSON.parse(tags) : [],
    // Only admin/superadmin may mark an article featured — matches the
    // existing pattern of staff-tier gating on editorial decisions.
    isFeatured: ["admin", "superadmin"].includes(req.user!.role)
      ? isFeatured === "true" || isFeatured === true
      : false,
    // Breaking is likewise an editorial-tier decision.
    isBreaking: ["admin", "superadmin"].includes(req.user!.role)
      ? isBreaking === "true" || isBreaking === true
      : false,
    breakingUntil:
      ["admin", "superadmin"].includes(req.user!.role) && parsedBreakingUntil
        ? parsedBreakingUntil
        : undefined,
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
    reporter, authorType,
    tags, isFeatured, isBreaking, breakingUntil,
    mediaType, videoUrl, videoProvider,
  } = req.body;

  const updateFields: Record<string, unknown> = {};

  // Only admin/superadmin may change the breaking flag / its expiry.
  if (["admin", "superadmin"].includes(req.user!.role)) {
    if (isBreaking !== undefined) {
      updateFields.isBreaking = isBreaking === "true" || isBreaking === true;
    }

    if (breakingUntil !== undefined) {
      const parsed = parseBreakingUntil(breakingUntil);
      if (parsed === undefined) {
        return res.status(400).json({
          success: false,
          message: "breakingUntil must be a valid date",
        });
      }
      updateFields.breakingUntil = parsed;
    }
  }

  if (tags !== undefined) {
    updateFields.tags = JSON.parse(tags);
  }

  // Only admin/superadmin may change the featured flag.
  if (isFeatured !== undefined && ["admin", "superadmin"].includes(req.user!.role)) {
    updateFields.isFeatured = isFeatured === "true" || isFeatured === true;
  }

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

  //media (images or video)
  const uploadedFiles = (req.files ?? {}) as NewsMediaFiles;
  const imageFiles = uploadedFiles.images ?? [];
  const videoFile = uploadedFiles.video?.[0];

  const existingImages = existingNews.media?.images ?? [];

  const keptKeys: string[] = req.body.keptImageKeys
    ? JSON.parse(req.body.keptImageKeys)
    : existingImages.map((image) => image.key);

  const imagesChanged = imageFiles.length > 0 || req.body.keptImageKeys !== undefined;

  const requestedMediaType =
    mediaType === "image" || mediaType === "video" ? mediaType : undefined;

  const existingVideo = existingNews.media?.video;
  const existingUploadedVideoKey =
    existingNews.media?.type === "video" && existingVideo?.provider === "s3"
      ? existingVideo.key
      : undefined;

  if (requestedMediaType === "video") {
    if (!videoFile && !videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Provide a video file or a video URL when switching to video",
      });
    }

    if (!videoFile && !["youtube", "vimeo"].includes(videoProvider)) {
      return res.status(400).json({
        success: false,
        message: "videoProvider must be youtube or vimeo when providing a video link",
      });
    }

    // Clean up whatever storage-backed media the article currently has.
    if (existingNews.media?.type === "image" && existingImages.length > 0) {
      await deleteNewsImages(existingImages);
    }
    if (existingUploadedVideoKey) {
      await deleteNewsVideo(existingUploadedVideoKey);
    }

    updateFields.media = videoFile
      ? { type: "video", video: { ...(await uploadNewsVideo(videoFile)), provider: "s3" } }
      : { type: "video", video: { url: videoUrl, provider: videoProvider } };
  } else if (requestedMediaType === "image" || imagesChanged) {
    if (existingUploadedVideoKey) {
      await deleteNewsVideo(existingUploadedVideoKey);
    }

    const images = await updateNewsImages(existingImages, keptKeys, imageFiles);

    updateFields.media = {
      type: "image",
      images,
    };
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

  const {
    page = 1,
    limit = 10,
    search,
    status,
    province,
    category,
    subCategory,
    reporter,
    editor,
    dateFrom,
    dateTo
  } = req.query;

  const query: Record<string, unknown> = {};

  // editor only sees their own articles, while admin/superadmin see everything
  if (req.user!.role === "editor") {
    query.editor = req.user!.id;
  }

  // Status filter
  if (status && typeof status === "string") {
    query.status = status;
  }

  // Province filter
  if (province && typeof province === "string") {
    query.province = String(province).toLowerCase();
  }

  // Category filter
  if (category && typeof category === "string") {
    query.category = category;
  }

  // Sub-category filter
  if (subCategory && typeof subCategory === "string") {
    query.subCategory = subCategory;
  }

  // Reporter filter
  if (reporter && typeof reporter === "string") {
    query.reporter = reporter;
  }

  // Editor filter 
  //  Only useful for admin/superadmin
  if (
    editor &&
    typeof editor === "string" &&
    req.user!.role !== "editor"
  ) {
    query.editor = editor;
  }


  //search
  if (search && typeof search === "string") {
    const regex = new RegExp(search, "i");

    query.$or = [
      { "content.np.title": regex },
      { "content.en.title": regex },
      { slug: regex },
    ]
  }

  //Date range filter
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};

    if (dateFrom && typeof dateFrom === "string") {
      createdAt.$gte = new Date(dateFrom);
    }

    if (dateTo && typeof dateTo === "string") {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // Set to end of the day

      createdAt.$lte = endDate;
    }

    query.createdAt = createdAt;
  }

  const result = await paginate(newsModel, query, {
    page: page as string,
    limit: limit as string,
    sort: { createdAt: -1 },
    populate: [
      { path: "category", select: "name slug" },
      { path: "subCategory", select: "name slug" },
      { path: "editor", select: "name email role" },
      { path: "reporter", select: "name email phone " }
    ],
  });

  res.json({
    success: true,
    ...result
  });
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

  if (req.query.tag) {
    query.tags = String(req.query.tag).trim().toLowerCase();
  }

  if (req.query.featured) {
    query.isFeatured = String(req.query.featured) === "true";
  }

  // Only the affirmative filter is supported: `breaking=true` returns
  // currently-active breaking items (flag set and not past `breakingUntil`).
  if (String(req.query.breaking) === "true") {
    query.isBreaking = true;
    query.$and = [breakingNotExpired()];
  }

  if (req.query.category) {
    const categoryDoc = await Category.findOne({ slug: req.query.category });
    if (categoryDoc) {
      query.category = categoryDoc._id;
    } else {
      // If category slug is provided but not found, return empty result
      return res.json({
        success: true,
        page,
        limit,
        total: 0,
        totalPages: 0,
        data: [],
      });
    }
  }

  // Parallel queries: get news + total count
  const [newsList, total] = await Promise.all([
    newsModel
      .find(query)
      .sort(resolveNewsSort(req.query.sort)) // default: featured first, then latest
      .skip(skip)
      .limit(limit)
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .populate({
        path: "comments",
        match: { status: "approved" }, // only approved comments are public
        select: "userId commentText createdAt",
        populate: { path: "userId", select: "name" },
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
      match: { status: "approved" },
      select: "userId commentText createdAt",
      populate: { path: "userId", select: "name" },
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

export const getLatestNewsByCategory = asyncHandler(async (req, res) => {

  const categories = await Category.find({
    parent: null
  }).select("_id name slug");

  const categoryIds = categories.map(category => category._id);

  const latestNews = await newsModel.aggregate([
    {
      $match: {
        status: "approved",
        category: { $in: categoryIds }
      }
    },

    {
      $sort: {
        publishedAt: -1
      }
    },

    {
      $group: {
        _id: "$category",
        news: { $first: "$$ROOT" }
      }
    }
  ])

  const newsMap = new Map(
    latestNews.map(item => [
      item._id.toString(),
      item.news
    ])
  );

  const data = categories.map(category => ({
    category: {
      _id: category._id,
      name: category.name,
      slug: category.slug
    },
    news: newsMap.get(category._id.toString()) || null
  }));

  return res.json({
    success: true,
    data
  })
})

// admin :delete
export const deleteNews = asyncHandler(async (req, res) => {
  const newsId = req.params.id;

  // Check if the news exists
  const news = await newsModel.findById(newsId);
  if (!news) {
    return res.status(404).json({ success: false, message: "News not found" });
  }

  //  Delete images from Cloudinary if stored there
  await deleteNewsImages(news.media?.images || []);

  await newsModel.findByIdAndDelete(newsId);

  res.json({ success: true, message: "News deleted successfully" });
});
// public: Get top N most-viewed news (approved only)
export const getMostViewedNews = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit)) || 5, 20);

  const newsList = await newsModel
    .find({ status: "approved" })
    .sort({ views: -1, publishedAt: -1 }) // tie-break on recency
    .limit(limit)
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .select("-content.np.body -content.en.body") // list view, no need for full body
    .lean();

  return res.json({
    success: true,
    data: newsList,
  });
});

// Staff: dashboard summary stats — article counts by status, total views,
// and pending-comment count are otherwise only derivable by paging through
// full list endpoints client-side, which doesn't scale.
export const getNewsStats = asyncHandler(async (req, res) => {
  const baseQuery: Record<string, unknown> = {};

  // Editors only see stats for their own articles, matching getManageNews.
  if (req.user!.role === "editor") {
    baseQuery.editor = req.user!.id;
  }

  const [statusCounts, viewsAgg] = await Promise.all([
    newsModel.aggregate([
      { $match: baseQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    newsModel.aggregate([
      { $match: baseQuery },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]),
  ]);

  const byStatus: Record<string, number> = {
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const entry of statusCounts) {
    if (typeof entry._id === "string") {
      byStatus[entry._id] = entry.count;
    }
  }

  const totalArticles = Object.values(byStatus).reduce(
    (sum, count) => sum + count,
    0
  );

  return res.json({
    success: true,
    data: {
      totalArticles,
      totalViews: viewsAgg[0]?.totalViews ?? 0,
      byStatus,
    },
  });
});