import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: {
    np: string;
    en: string;
  };
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  name: {
    np: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: "" },
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
}, { timestamps: true });

//unique per slug
categorySchema.index({ slug: 1 }, { unique: true });

const Category = mongoose.model<ICategory>("Category", categorySchema);
export default Category;
