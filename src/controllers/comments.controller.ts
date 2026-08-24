import CommentModel from "../models/comments.model.js";
import newsModel from "../models/news.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// CREATE COMMENT
export const createComment = asyncHandler(async (req, res) => {
  const { newsId, username, userEmail, commentText } = req.body;

  // Check if news exists
  const newsExists = await newsModel.findById(newsId);

  if (!newsExists) {
    return res.status(404).json({
      status: false,
      message: "News not found" 
      });
  }

  const comment = await CommentModel.create({
    newsId,
    username,
    userEmail,
    commentText,
  });

  res.status(201).json({ 
    success: true, 
    message:  "Your comment has been submitted and is awaiting moderation.",
   });
});

//updateCommnet

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
      message: "Comment not found" 
    });
  }

  return res.json({
     success: true, 
     message: "Comment updated successfully",
     comment: updated 
    });
});

// DELETE COMMENT
export const deleteComment = asyncHandler(async (req, res) => {
  const deleted = await CommentModel.findByIdAndDelete(req.params.id);

  if (!deleted) {
    return res.status(404).json({ 
      success: false,
      message: "Comment not found" 
    });
  }

  return res.json({ 
    success: true, 
    message: "Comment deleted successfully" 
  });
});
