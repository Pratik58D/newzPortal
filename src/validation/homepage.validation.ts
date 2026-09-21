import { z } from "zod";

export const AD_PLACEMENTS = [
  "top_banner",
  "home_banner",
  "sidebar",
  "news_detail_top",
  "news_detail_bottom",
] as const;

// Sections that make no sense twice on one page.
const SINGLETON_TYPES = ["hero", "latest", "province"] as const;

const MAX_SECTIONS = 20;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const limit = z.number().int().min(1).max(20);

const common = {
  // Present for sections that already exist; the server generates one for new
  // sections so the client never invents identifiers.
  key: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(60)
    .optional(),
  enabled: z.boolean(),
  title: z.strictObject({
    np: z.string().trim().max(100),
    en: z.string().trim().max(100),
  }),
};

const sectionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    ...common,
    type: z.literal("hero"),
    config: z.strictObject({}),
  }),
  z.strictObject({
    ...common,
    type: z.literal("latest"),
    config: z.strictObject({ limit }),
  }),
  z.strictObject({
    ...common,
    type: z.literal("category"),
    config: z.strictObject({
      categorySlug: z
        .string()
        .regex(SLUG_PATTERN, "Invalid category slug")
        .max(100),
      limit,
    }),
  }),
  z.strictObject({
    ...common,
    type: z.literal("province"),
    config: z.strictObject({ limit }),
  }),
  z.strictObject({
    ...common,
    type: z.literal("banner-ad"),
    config: z.strictObject({ placement: z.enum(AD_PLACEMENTS) }),
  }),
]);

// PUT replaces the whole ordered list: array position is the display order.
export const updateHomepageSchema = z
  .strictObject({
    sections: z.array(sectionSchema).min(1).max(MAX_SECTIONS),
  })
  .superRefine(({ sections }, ctx) => {
    const seenKeys = new Set<string>();

    sections.forEach((section, index) => {
      if (section.key) {
        if (seenKeys.has(section.key)) {
          ctx.addIssue({
            code: "custom",
            path: ["sections", index, "key"],
            message: `Duplicate section key "${section.key}"`,
          });
        }
        seenKeys.add(section.key);
      }
    });

    for (const type of SINGLETON_TYPES) {
      if (sections.filter((section) => section.type === type).length > 1) {
        ctx.addIssue({
          code: "custom",
          path: ["sections"],
          message: `Only one "${type}" section is allowed`,
        });
      }
    }
  });

export type UpdateHomepageInput = z.infer<typeof updateHomepageSchema>;
export type HomepageSectionInput = UpdateHomepageInput["sections"][number];
