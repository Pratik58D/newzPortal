import express from "express";
import { createComment, deleteComment, getComments, updateComment, updateCommentStatus } from "../controllers/comments.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createCommentSchema  ,updateCommentSchema, updateCommentStatusSchema} from "../validation/comment.validation.js";
import { authMiddleware, role } from "../middleware/auth.middleware.js";

const commentRouter = express.Router();

commentRouter.get("/", authMiddleware, role, getComments);
commentRouter.post("/", authMiddleware, validate(createCommentSchema), createComment);
commentRouter.put("/:id", authMiddleware, role,validate(updateCommentSchema), updateComment);
commentRouter.delete("/:id",authMiddleware, role, deleteComment);
commentRouter.patch("/:id/status", authMiddleware,role ,validate(updateCommentStatusSchema), updateCommentStatus);

export default commentRouter;
