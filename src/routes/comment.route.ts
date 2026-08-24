import express from "express";
import { createComment, deleteComment, updateComment } from "../controllers/comments.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createCommentSchema  ,updateCommentSchema} from "../validation/zod.validation.js";
import { authMiddleware, role } from "../middleware/auth.middleware.js";

const commentRouter = express.Router();

commentRouter.post("/",validate(createCommentSchema), createComment);
commentRouter.put("/update/:id", authMiddleware, role,validate(updateCommentSchema), updateComment);
commentRouter.delete("/delete/:id",authMiddleware, role, deleteComment);

export default commentRouter;
