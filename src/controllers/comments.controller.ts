import CommentModel from "../models/comments.model.js";
import newsModel from "../models/news.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// CREATE COMMENT
export const createComment = asyncHandler(async (req, res) => {
  const { newsId, commentText } = req.body;

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
    userId: req.user!.id,
    commentText,
  });

  res.status(201).json({ 
    success: true, 
    message:  "Your comment has been submitted and is awaiting moderation.",
   });
});



//get comment for admin that has everything on that
export const getComments= asyncHandler(async(req,res)=> {
  const comments = await CommentModel.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  if (!comments || comments.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No comments found for this news article",
    });
  }

  return res.status(200).json({
    success: true,
    message: "All comments retrieved successfully",
    comments,
  });
});

//update Comment text
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

 //update comment status
 export const updateCommentStatus= asyncHandler(async(req,res)=> {

  const { status } = req.body;

  const updatedComment = await CommentModel.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  )

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
  })
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
