import { z } from "zod";

export const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Invalid email format",
    }),
});
