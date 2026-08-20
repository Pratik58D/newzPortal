import express from "express";
import { createComment, deleteComment, updateComment } from "../controllers/comments.controller.js";
const commentRouter = express.Router();
commentRouter.post("/", createComment);
commentRouter.put("/update/:id", updateComment);
commentRouter.delete("/delete/:id", deleteComment);
export default commentRouter;
//# sourceMappingURL=comment.route.js.map