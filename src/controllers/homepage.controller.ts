import HomepageSection from "../models/homepageSection.model.js";
import { revalidateFrontend, REVALIDATE_TAGS } from "../utils/revalidate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assignKeys, orderFor } from "../utils/homepageLayout.js";
import { homepageSectionsSeed } from "../seeds/siteContent.data.js";
import type { UpdateHomepageInput } from "../validation/homepage.validation.js";

interface SectionShape {
  key: string;
  type: string;
  enabled: boolean;
  order: number;
  title?: { np: string; en: string };
  config?: Record<string, unknown>;
}

// `minimize` drops empty objects on save (e.g. a hero's `{}` config), so a
// stored document can be missing `config`; always answer with a full shape.
const toResponse = (section: SectionShape) => ({
  key: section.key,
  type: section.type,
  enabled: section.enabled,
  order: section.order,
  title: section.title ?? { np: "", en: "" },
  config: section.config ?? {},
});

// Same layout the Phase 0 seed inserts. Used only while no section has ever
// been saved, so the public site works before the seed is run.
async function loadSections(): Promise<{
  sections: ReturnType<typeof toResponse>[];
  isDefault: boolean;
}> {
  const stored = await HomepageSection.find().sort({ order: 1 }).lean();

  if (stored.length === 0) {
    return {
      sections: homepageSectionsSeed.map(toResponse),
      isDefault: true,
    };
  }

  return { sections: stored.map(toResponse), isDefault: false };
}

// Public: only enabled sections, in display order.
export const getHomepage = asyncHandler(async (_req, res) => {
  const { sections } = await loadSections();

  res.json({
    success: true,
    data: sections.filter((section) => section.enabled),
  });
});

// Admin: every section, including disabled ones.
export const manageHomepage = asyncHandler(async (_req, res) => {
  const { sections, isDefault } = await loadSections();

  res.json({ success: true, isDefault, data: sections });
});

export const updateHomepage = asyncHandler(async (req, res) => {
  const { sections } = req.body as UpdateHomepageInput;
  const keyed = assignKeys(sections);

  // Upsert every section first and delete the stale ones last, so a failure
  // part-way through can only leave extra sections behind, never lose the
  // new layout. (No transaction: it would need a replica set.)
  await HomepageSection.bulkWrite(
    keyed.map((section, index) => ({
      updateOne: {
        filter: { key: section.key },
        update: {
          $set: {
            type: section.type,
            enabled: section.enabled,
            order: orderFor(index),
            title: section.title,
            config: section.config,
          },
        },
        upsert: true,
      },
    })),
  );

  await HomepageSection.deleteMany({
    key: { $nin: keyed.map((section) => section.key) },
  });

  revalidateFrontend([REVALIDATE_TAGS.homepage]);

  const { sections: saved } = await loadSections();

  res.json({
    success: true,
    message: "Homepage updated",
    isDefault: false,
    data: saved,
  });
});
