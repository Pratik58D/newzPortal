import mongoose, { Schema } from "mongoose";
const commentSchema = new Schema({
    newsId: {
        type: Schema.Types.ObjectId,
        ref: "NewsArticle",
        required: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
    },
    userEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    commentText: {
        type: String,
        required: true,
        trim: true,
    },
}, { timestamps: true });
const CommentModel = mongoose.model("Comment", commentSchema);
export default CommentModel;
//# sourceMappingURL=comments.model.js.map