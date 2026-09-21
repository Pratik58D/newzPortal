import { z } from "zod";

export const createReporterSchema = z.object({
  name: z.string().trim().min(1, "Reporter name is required"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Invalid email format",
    })
    .optional(),
  phone: z.string().trim().optional(),
});

export const updateReporterSchema = z.object({
  name: z.string().trim().min(1, "Reporter name is required").optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Invalid email format",
    })
    .optional(),
  phone: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});
