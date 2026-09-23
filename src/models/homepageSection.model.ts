import mongoose, { Document, Schema, Types } from "mongoose";

// Whitelist of renderable section types — the homepage is an ordered list of
// these, not free-form content.
export const HOMEPAGE_SECTION_TYPES = [
  "hero",
  "latest",
  "category",
  "province",
  "banner-ad",
] as const;

export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

export interface IHomepageSection extends Document {
  _id: Types.ObjectId;
  // Stable identifier so the seed (and later admin tooling) can address a
  // section without relying on its position or database id.
  key: string;
  type: HomepageSectionType;
  enabled: boolean;
  order: number;
  // Optional heading override; empty means "use the section's natural title"
  // (e.g. the category name for a `category` section).
  title: { np: string; en: string };
  config: {
    categorySlug?: string;
    limit?: number;
    placement?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const homepageSectionSchema = new Schema<IHomepageSection>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: HOMEPAGE_SECTION_TYPES, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
    title: {
      np: { type: String, trim: true, default: "" },
      en: { type: String, trim: true, default: "" },
    },
    config: {
      categorySlug: { type: String, trim: true, lowercase: true },
      limit: { type: Number, min: 1, max: 20 },
      placement: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

homepageSectionSchema.index({ order: 1 });

const HomepageSection = mongoose.model<IHomepageSection>(
  "HomepageSection",
  homepageSectionSchema,
);

export default HomepageSection;
