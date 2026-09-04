import CommentModel from "../models/comments.model.js";
import newsModel from "../models/news.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paginate } from "../utils/paginate.js";

// CREATE COMMENT
export const createComment = asyncHandler(async (req, res) => {
  const { newsId, commentText } = req.body;

  // Check if news exists
  const newsExists = await newsModel.findById(newsId);

  if (!newsExists) {
    return res.status(404).json({
      status: false,
      message: "News not found",
    });
  }

  await CommentModel.create({
    newsId,
    userId: req.user!.id,
    commentText,
  });

  return res.status(201).json({
    success: true,
    message: "Your comment has been submitted and is awaiting moderation.",
  });
});

// GET COMMENTS FOR ADMIN
export const getComments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
  } = req.query;

  const result = await paginate(CommentModel, {}, {
    page: page as string,
    limit: limit as string,
    sort: { createdAt: -1 },
    populate: [
      {
        path: "userId",
        select: "name email",
      },
      {
        path: "newsId",
        select: "slug content.np.title content.en.title",
      },
    ],
  });

  return res.status(200).json({
    success: true,
    message: "All comments retrieved successfully",
    ...result,
  });
});

// UPDATE COMMENT TEXT
export const updateComment = asyncHandler(async (req, res) => {
  const { commentText } = req.body;

  const updated = await CommentModel.findByIdAndUpdate(
    req.params.id,
    { commentText },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: "Comment not found",
    });
  }

  return res.json({
    success: true,
    message: "Comment updated successfully",
    comment: updated,
  });
});

// UPDATE COMMENT STATUS
export const updateCommentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const updatedComment = await CommentModel.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!updatedComment) {
    return res.status(404).json({
      success: false,
      message: "Comment not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Comment status updated successfully",
    comment: updatedComment,
  });
});

// DELETE COMMENT
export const deleteComment = asyncHandler(async (req, res) => {
  const deleted = await CommentModel.findByIdAndDelete(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Comment not found",
    });
  }

  return res.json({
    success: true,
    message: "Comment deleted successfully",
  });
});