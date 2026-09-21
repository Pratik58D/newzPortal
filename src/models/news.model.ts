import mongoose, { Document, Schema, Types } from "mongoose";
import { PROVINCE_CODES, type ProvinceCode } from "../constants/provinces.js";
import mediaSchema, { IMedia } from "./media.model.js";

export type NewsStatus = "draft" | "pending" | "approved" | "rejected";


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

  editor: Types.ObjectId;
  reporter?: Types.ObjectId;
  authorType: "reporter" | "editor";

  province?: ProvinceCode;

  content: {
    np: IContentBlock;
    en: IContentBlock;
  };

  media?: IMedia;

  publishedAt?: Date;
  status: NewsStatus;
  rejectionReason?: string;
  views: number;
  tags: string[];
  isFeatured: boolean;
  isBreaking: boolean;
  breakingUntil?: Date;

  createdAt: Date;
  updatedAt: Date;
}

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
  editor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reporter: {
    type: Schema.Types.ObjectId,
    ref: "Reporter",
  },
  authorType: {
    type: String,
     enum: ["reporter", "editor"],
     default: "reporter",
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
    type: Date
  },
  status: {
    type: String,
    enum: ["draft", "pending", "approved", "rejected"],
    default: "draft",
  },
  rejectionReason: {
    type: String,
  },
  views: {
    type: Number,
    default: 0,
  },
  tags: {
    type: [String],
    default: [],
    // Normalize on write so lookups/filters (GET /api/news?tag=) can do an
    // exact, case-insensitive match without a regex on every query.
    set: (tags: string[]) =>
      Array.isArray(tags)
        ? [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
        : [],
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isBreaking: {
    type: Boolean,
    default: false,
  },
  // Optional expiry so a breaking flag can't linger forever; absent = no expiry.
  breakingUntil: {
    type: Date,
  },
}, { timestamps: true });

newsArticleSchema.index({ tags: 1 });
newsArticleSchema.index({ isBreaking: 1, publishedAt: -1 });

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
