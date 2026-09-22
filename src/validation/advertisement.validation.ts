import { z } from "zod";

import { AD_SLOT_KEYS } from "../constants/adSlots.js";
import { AD_DEVICES } from "../models/advertisement.model.js";
import { redirectUrlProblem } from "./redirectUrl.js";

const PLACEMENTS = AD_SLOT_KEYS;
const DEVICES = AD_DEVICES as unknown as readonly [string, ...string[]];

// Only absolute http(s) URLs, no credentials, <= 2048 chars. The message is
// the specific problem, so the admin sees why a link was refused.
const redirectUrlField = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const problem = redirectUrlProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

// Advertisement routes are multipart/form-data (image upload via Multer),
// so every field in req.body arrives as a string — booleans/dates included.
const isActiveField = z
  .string()
  .refine((value) => value === "true" || value === "false", {
    message: "isActive must be 'true' or 'false'",
  })
  .optional();

const dateField = (label: string) =>
  z.string().refine((value) => !isNaN(new Date(value).getTime()), {
    message: `Invalid ${label}`,
  });

// `placements` arrives as a JSON array string, e.g. '["sidebar","top_banner"]'.
const placementsField = z
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "placements must be a JSON array" });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(z.enum(PLACEMENTS, { message: "Invalid placement" }))
      .min(1, "Choose at least one placement")
      .max(PLACEMENTS.length)
      .refine((list) => new Set(list).size === list.length, {
        message: "Placements must not repeat",
      }),
  );

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,3}$/, `${label} must be a whole number`)
    .transform(Number)
    .pipe(z.number().min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`));

// Only the new (Phase 1) fields; all optional, defaults live on the model.
const extraFields = {
  placements: placementsField.optional(),
  priority: wholeNumber("Priority", 0, 100).optional(),
  weight: wholeNumber("Weight", 1, 10).optional(),
  altText: z.string().trim().max(200, "Alt text must be 200 characters or fewer").optional(),
  // Optional small label under the ad; empty means no label.
  sponsorLabel: z
    .string()
    .trim()
    .max(30, "Sponsor label must be 30 characters or fewer")
    .optional(),
  // Which viewports the ad shows on; defaults to "all" on the model.
  devices: z.enum(DEVICES, { message: "Invalid devices value" }).optional(),
};

// A request names its slots with `placements` (preferred) or the legacy single
// `placement`. Either way the parsed body carries both: `placements` (list) and
// `placement` (= the first), which is what the controller stores.
const withSlots = <T extends { placement?: string; placements?: string[] }>(data: T) => {
  const placements = data.placements ?? (data.placement ? [data.placement] : undefined);
  return placements
    ? { ...data, placements, placement: placements[0] }
    : data;
};

export const createAdvertisementSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    redirectUrl: redirectUrlField,
    placement: z.enum(PLACEMENTS, { message: "Invalid placement" }).optional(),
    startDate: dateField("start date"),
    endDate: dateField("end date"),
    isActive: isActiveField,
    ...extraFields,
  })
  .superRefine((data, ctx) => {
    if (!data.placement && !data.placements) {
      ctx.addIssue({ code: "custom", path: ["placements"], message: "Choose at least one placement" });
    }
  })
  .transform(withSlots);

export const updateAdvertisementSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").optional(),
    redirectUrl: redirectUrlField.optional(),
    placement: z.enum(PLACEMENTS, { message: "Invalid placement" }).optional(),
    startDate: dateField("start date").optional(),
    endDate: dateField("end date").optional(),
    isActive: isActiveField,
    // "true" removes the mobile image.
    removeMobileImage: isActiveField,
    ...extraFields,
  })
  .transform(withSlots);
