import newsModel from "../models/news.model.js";
import { extractPublicId, uploadToCloudinary, } from "../utils/imageHandling.js";
import { paginate } from "../utils/paginate.js";
import Category from "../models/category.model.js";
import cloudinary from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateSlug } from "../utils/generateSlug.js";
// Staff (editor/admin/superadmin): CREATE
// - editor-created articles start as "draft" and go through review
// - admin/superadmin-created articles are auto-approved
export const createNews = asyncHandler(async (req, res) => {
    const { titleNp, summaryNp, bodyNp, titleEn, summaryEn, bodyEn, category, province, date, } = req.body;
    const files = req.files;
    if (!titleNp || !category || !date || !files?.length) {
        return res
            .status(400)
            .json({ message: "Missing required fields or images." });
    }
    let slug = generateSlug(titleEn, titleNp, "news");
    const exists = await newsModel.findOne({ slug });
    if (exists)
        slug += "-" + Date.now();
    let imageUrls;
    try {
        imageUrls = await uploadToCloudinary(files);
    }
    catch (error) {
        throw new ApiError(500, "Failed to upload images", error);
    }
    const isSelfPublisher = ["admin", "superadmin"].includes(req.user.role);
    const news = new newsModel({
        slug,
        category,
        province: province || undefined,
        author: req.user.id,
        media: { type: "image", images: imageUrls },
        content: {
            np: { title: titleNp, summary: summaryNp || "", body: bodyNp || "" },
            en: { title: titleEn || "", summary: summaryEn || "", body: bodyEn || "" },
        },
        publishedAt: date,
        status: isSelfPublisher ? "approved" : "draft",
    });
    await news.save();
    res
        .status(201)
        .json({ success: true, message: "News created", data: news });
});
//  Staff: UPDATE
// editors may only edit their own draft/rejected articles; admin/superadmin may edit anything
export const updateNews = asyncHandler(async (req, res) => {
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
    const { titleNp, summaryNp, bodyNp, titleEn, summaryEn, bodyEn, category, province, date, status, } = req.body;
    const updateFields = { status };
    if (province !== undefined)
        updateFields.province = province || undefined;
    if (date)
        updateFields.publishedAt = date;
    const hasContentChange = titleNp || summaryNp || bodyNp || titleEn || summaryEn || bodyEn;
    if (hasContentChange) {
        const merged = {
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
        updateFields.content = merged;
        let slug = generateSlug(merged.en.title, merged.np.title, "news");
        const exists = await newsModel.findOne({
            slug,
            _id: { $ne: req.params.id },
        });
        if (exists)
            slug += "-" + Date.now();
        updateFields.slug = slug;
    }
    if (category) {
        const categoryDoc = await Category.findById(category);
        if (!categoryDoc) {
            return res.status(404).json({ message: "Category not found" });
        }
        updateFields.category = categoryDoc._id;
    }
    const files = req.files;
    if (files && files.length > 0) {
        try {
            updateFields.media = { type: "image", images: await uploadToCloudinary(files) };
        }
        catch (error) {
            throw new ApiError(500, "Failed to upload images", error);
        }
    }
    const updatedNews = await newsModel.findByIdAndUpdate(req.params.id, updateFields, {
        new: true,
    });
    res.json({ success: true, data: updatedNews });
});
// Editor (author only) / admin / superadmin: submit a draft or rejected article for review
export const submitNews = asyncHandler(async (req, res) => {
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
});
// Admin/superadmin: approve a pending article
export const approveNews = asyncHandler(async (req, res) => {
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
});
// Admin/superadmin: reject a pending article, optionally with a reason
export const rejectNews = asyncHandler(async (req, res) => {
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
});
// Staff: moderation queue / "my articles" view - any status, filtered by ownership for editors
export const getManageNews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, province } = req.query;
    const query = {};
    if (req.user.role === "editor") {
        query.author = req.user.id;
    }
    if (status) {
        query.status = status;
    }
    if (province) {
        query.province = String(province).toLowerCase();
    }
    const result = await paginate(newsModel, query, {
        page: page,
        limit: limit,
        sort: { createdAt: -1 },
        populate: [
            { path: "category", select: "name slug" },
            { path: "author", select: "name email role" },
        ],
    });
    res.json({ success: true, ...result });
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
    try {
        for (const imageUrl of news.media?.images || []) {
            const publicId = extractPublicId(imageUrl);
            await cloudinary.uploader.destroy(publicId);
        }
    }
    catch (error) {
        throw new ApiError(500, "Failed to delete images from storage", error);
    }
    await newsModel.findByIdAndDelete(newsId);
    res.json({ success: true, message: "News deleted successfully" });
});
//public :Get paginated news with comments and category
export const getNews = asyncHandler(async (req, res) => {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = parseInt(String(req.query.limit)) || 10;
    const search = req.query.search || "";
    const query = { status: "approved" }; // only approved news is public
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
});
//  Get one news article by slug (with category and comments)
export const getNewsBySlug = asyncHandler(async (req, res) => {
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
});
//# sourceMappingURL=news.controller.js.map