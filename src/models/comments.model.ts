import mongoose, { Document, Schema, Types } from "mongoose";

// guest only comment

export interface IComment extends Document {
  _id: Types.ObjectId;
  newsId: Types.ObjectId;
  username: string;
  userEmail: string;
  commentText: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
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

const CommentModel = mongoose.model<IComment>("Comment", commentSchema);

export default CommentModel;
