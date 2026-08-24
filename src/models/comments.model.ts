import mongoose, { Document, Schema, Types } from "mongoose";

export type CommentStatus = "pending" | "approved" | "rejected";


// guest only comment

export interface IComment extends Document {
  _id: Types.ObjectId;
  newsId: Types.ObjectId;
  username: string;
  userEmail: string;
  commentText: string;
  status: CommentStatus;
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
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
}, { timestamps: true });

commentSchema.index({ newsId: 1, status: 1 });

const CommentModel = mongoose.model<IComment>("Comment", commentSchema);

export default CommentModel;
