import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: {
    np: string;
    en: string;
  };
  slug: string;
  parent?: Types.ObjectId | null;
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
  // absence/null means this is a top-level category; otherwise it's a subcategory of `parent`
  parent: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
}, { timestamps: true });

//unique per slug
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1 });

const Category = mongoose.model<ICategory>("Category", categorySchema);
export default Category;
