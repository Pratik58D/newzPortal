import mongoose, { Document, Schema, Types } from "mongoose";
import { PROVINCE_CODES, type ProvinceCode } from "../constants/provinces.js";

export type NewsStatus = "draft" | "pending" | "approved" | "rejected";
export type MediaType = "image" | "video";
export type VideoProvider = "s3" | "youtube" | "vimeo" | "other";

interface IMedia {
  type: MediaType;
  images: string[];
  video?: {
    url?: string;
    provider?: VideoProvider;
    duration?: number;
    thumbnail?: string;
  };
}

interface IContentBlock {
  title: string;
  summary: string;
  body: string;
}

export interface INewsArticle extends Document {
  _id: Types.ObjectId;
  slug: string;
  category: Types.ObjectId;
  subCategory?: Types.ObjectId;
  author: Types.ObjectId;
  province?: ProvinceCode;
  content: {
    np: IContentBlock;
    en: IContentBlock;
  };
  media: IMedia;
  publishedAt: Date;
  status: NewsStatus;
  rejectionReason?: string;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>({
  type: {
    type: String,
    enum: ["image", "video"],
    required: true,
  },
  images: {
    type: [String],
    default: [],
  },
  video: {
    url: String,
    provider: {
      type: String,
      enum: ["s3", "youtube", "vimeo", "other"],
    },
    duration: Number,
    thumbnail: String,
  },
}, { _id: false });

const newsArticleSchema = new Schema<INewsArticle>({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // optional - absence means the story isn't tied to a specific region
  province: {
    type: String,
    enum: PROVINCE_CODES,
  },
  content: {
    np: {
      title: { type: String, required: true },
      summary: { type: String, default: "" },
      body: { type: String, default: "" },
    },
    en: {
      title: { type: String, default: "" },
      summary: { type: String, default: "" },
      body: { type: String, default: "" },
    },
  },
  media: mediaSchema,
  publishedAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: {
    type: String,
  },
  views: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Text index for search
newsArticleSchema.index({
  "content.np.title": "text",
  "content.np.body": "text",
  "content.en.title": "text",
  "content.en.body": "text",
}, {
  weights: {
    "content.np.title": 5,
    "content.en.title": 5,
    "content.np.body": 3,
    "content.en.body": 3,
  },
});

newsArticleSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "newsId",
  justOne: false,
});

// Enable virtuals in JSON and Object output
newsArticleSchema.set("toObject", { virtuals: true });
newsArticleSchema.set("toJSON", { virtuals: true });

const newsModel = mongoose.model<INewsArticle>("NewsArticle", newsArticleSchema);
export default newsModel;
