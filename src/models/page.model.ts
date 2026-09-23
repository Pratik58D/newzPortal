import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPage extends Document {
  _id: Types.ObjectId;
  slug: string;
  title: { np: string; en: string };
  // Markdown source. Must be sanitized/rendered safely by whatever serves it.
  body: { np: string; en: string };
  isPublished: boolean;
  showInFooter: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    title: {
      np: { type: String, required: true, trim: true },
      en: { type: String, trim: true, default: "" },
    },
    body: {
      np: { type: String, default: "" },
      en: { type: String, default: "" },
    },
    isPublished: { type: Boolean, default: false },
    showInFooter: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Page = mongoose.model<IPage>("Page", pageSchema);

export default Page;
