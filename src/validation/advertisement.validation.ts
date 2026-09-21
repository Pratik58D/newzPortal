import { z } from "zod";

const PLACEMENTS = [
  "top_banner",
  "home_banner",
  "sidebar",
  "news_detail_top",
  "news_detail_bottom",
] as const;

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

export const createAdvertisementSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  redirectUrl: z.string().trim().min(1, "Redirect URL is required"),
  placement: z.enum(PLACEMENTS, {
    message: "Invalid placement",
  }),
  startDate: dateField("start date"),
  endDate: dateField("end date"),
  isActive: isActiveField,
});

export const updateAdvertisementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  redirectUrl: z.string().trim().min(1, "Redirect URL is required").optional(),
  placement: z
    .enum(PLACEMENTS, {
      message: "Invalid placement",
    })
    .optional(),
  startDate: dateField("start date").optional(),
  endDate: dateField("end date").optional(),
  isActive: isActiveField,
});
