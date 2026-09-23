import { z } from "zod";

const nameSchema = z.object({
  np: z.string().trim().min(1, "Category name (Nepali) is required"),
  en: z.string().trim().optional(),
});

export const createCategorySchema = z.object({
  name: nameSchema,
  parent: z.string().nullish(),
});

export const updateCategorySchema = z.object({
  name: nameSchema,
  parent: z.string().nullish(),
});
