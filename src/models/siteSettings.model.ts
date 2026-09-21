import mongoose, { Document, Schema, Types } from "mongoose";

export interface ILocalizedText {
  np: string;
  en: string;
}

export interface IFooterLink {
  label: ILocalizedText;
  // Exactly one of these is set: an internal Page (by slug) or an external URL.
  pageSlug?: string;
  url?: string;
}

export interface IFooterLinkGroup {
  title: ILocalizedText;
  links: IFooterLink[];
}

export interface ISiteSettings extends Document {
  _id: Types.ObjectId;
  // Singleton marker: there is only ever one settings document.
  key: "site";
  siteName: ILocalizedText;
  tagline: ILocalizedText;
  about: ILocalizedText;
  logo?: { url: string; key: string };
  contact: {
    email: string;
    phone: string;
    address: ILocalizedText;
  };
  social: {
    facebook: string;
    twitter: string;
    youtube: string;
    instagram: string;
  };
  seo: {
    title: ILocalizedText;
    description: ILocalizedText;
  };
  footerLinks: IFooterLinkGroup[];
  // Footer bottom line; the year and site name are composed at render time.
  copyright: ILocalizedText;
  footerNote: ILocalizedText;
  createdAt: Date;
  updatedAt: Date;
}

const localized = (requiredNp = false) => ({
  np: { type: String, trim: true, default: "", required: requiredNp },
  en: { type: String, trim: true, default: "" },
});

const footerLinkSchema = new Schema<IFooterLink>(
  {
    label: localized(true),
    pageSlug: { type: String, trim: true, lowercase: true },
    url: { type: String, trim: true },
  },
  { _id: false },
);

const footerLinkGroupSchema = new Schema<IFooterLinkGroup>(
  {
    title: localized(true),
    links: { type: [footerLinkSchema], default: [] },
  },
  { _id: false },
);

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: {
      type: String,
      enum: ["site"],
      default: "site",
      unique: true,
      immutable: true,
    },
    siteName: localized(true),
    tagline: localized(),
    about: localized(),
    logo: {
      url: { type: String },
      key: { type: String },
    },
    contact: {
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      address: localized(),
    },
    social: {
      facebook: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
      youtube: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
    },
    seo: {
      title: localized(),
      description: localized(),
    },
    footerLinks: { type: [footerLinkGroupSchema], default: [] },
    copyright: localized(),
    footerNote: localized(),
  },
  { timestamps: true },
);

const SiteSettings = mongoose.model<ISiteSettings>(
  "SiteSettings",
  siteSettingsSchema,
);

export default SiteSettings;
