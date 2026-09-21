import mongoose from "mongoose";
import { revalidateFrontend, REVALIDATE_TAGS } from "../utils/revalidate.js";

import Page from "../models/page.model.js";
import { pagesSeed } from "../seeds/siteContent.data.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { PageInput } from "../validation/page.validation.js";

interface PageShape {
  _id?: unknown;
  slug: string;
  title: { np: string; en: string };
  body?: { np: string; en: string };
  isPublished: boolean;
  showInFooter: boolean;
  updatedAt?: unknown;
}

const full = (page: PageShape) => ({
  id: page._id ? String(page._id) : undefined,
  slug: page.slug,
  title: page.title,
  body: page.body ?? { np: "", en: "" },
  isPublished: page.isPublished,
  showInFooter: page.showInFooter,
  updatedAt: page.updatedAt,
});

const summary = (page: PageShape) => ({
  slug: page.slug,
  title: page.title,
  showInFooter: page.showInFooter,
});

// Seeded starter pages are served only while no page has ever been saved, so
// footer links resolve on a fresh database. Once any page exists, the
// collection is the single source of truth (a deleted page stays deleted).
async function collectionIsEmpty(): Promise<boolean> {
  return (await Page.estimatedDocumentCount()) === 0;
}

// Public: published pages, without bodies.
export const getPages = asyncHandler(async (_req, res) => {
  if (await collectionIsEmpty()) {
    return res.json({
      success: true,
      data: pagesSeed.filter((p) => p.isPublished).map(summary),
    });
  }

  const pages = await Page.find({ isPublished: true })
    .sort({ slug: 1 })
    .select("slug title showInFooter")
    .lean();

  res.json({ success: true, data: pages.map(summary) });
});

// Public: one published page. Drafts and unknown slugs are both 404.
export const getPageBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug);

  if (await collectionIsEmpty()) {
    const seeded = pagesSeed.find((p) => p.slug === slug && p.isPublished);
    if (!seeded) throw new ApiError(404, "Page not found");
    return res.json({ success: true, data: full(seeded) });
  }

  const page = await Page.findOne({ slug, isPublished: true }).lean();
  if (!page) throw new ApiError(404, "Page not found");

  res.json({ success: true, data: full(page) });
});

// Admin: everything including drafts. While empty, show the seeded defaults so
// the editor can see them.
export const managePages = asyncHandler(async (_req, res) => {
  if (await collectionIsEmpty()) {
    return res.json({ success: true, isDefault: true, data: pagesSeed.map(full) });
  }

  const pages = await Page.find().sort({ slug: 1 }).lean();
  res.json({ success: true, isDefault: false, data: pages.map(full) });
});

const isDuplicate = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

export const createPage = asyncHandler(async (req, res) => {
  const input = req.body as PageInput;

  if (await Page.exists({ slug: input.slug })) {
    throw new ApiError(409, "A page with this slug already exists");
  }

  try {
    const page = await Page.create(input);
    revalidateFrontend([REVALIDATE_TAGS.pages]);
    res.status(201).json({ success: true, message: "Page created", data: full(page.toObject()) });
  } catch (err) {
    if (isDuplicate(err)) throw new ApiError(409, "A page with this slug already exists");
    throw err;
  }
});

export const updatePage = asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid page id");

  const input = req.body as PageInput;

  if (await Page.exists({ slug: input.slug, _id: { $ne: id } })) {
    throw new ApiError(409, "A page with this slug already exists");
  }

  try {
    const page = await Page.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).lean();
    if (!page) throw new ApiError(404, "Page not found");
    revalidateFrontend([REVALIDATE_TAGS.pages]);
    res.json({ success: true, message: "Page updated", data: full(page) });
  } catch (err) {
    if (isDuplicate(err)) throw new ApiError(409, "A page with this slug already exists");
    throw err;
  }
});

export const deletePage = asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid page id");

  const page = await Page.findByIdAndDelete(id).lean();
  if (!page) throw new ApiError(404, "Page not found");

  revalidateFrontend([REVALIDATE_TAGS.pages]);

  res.json({ success: true, message: "Page deleted" });
});
