import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BODY = 50_000;

const pageFields = {
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(SLUG_PATTERN, "Slug may contain only lowercase letters, numbers and hyphens"),
  title: z.strictObject({
    np: z.string().trim().min(1, "Nepali title is required").max(120),
    en: z.string().trim().max(120),
  }),
  body: z.strictObject({
    np: z.string().max(MAX_BODY),
    en: z.string().max(MAX_BODY),
  }),
  isPublished: z.boolean(),
  showInFooter: z.boolean(),
};

export const createPageSchema = z.strictObject(pageFields);
export const updatePageSchema = z.strictObject(pageFields);

export type PageInput = z.infer<typeof createPageSchema>;
