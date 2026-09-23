import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Invalid email format",
  });

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long");

// Superadmin-only staff account creation
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["editor", "admin", "superadmin"]).optional(),
});

// Public self-registration (always creates a "user" role account)
export const registerUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// At-least-one-field enforcement stays in the controller (updateUser),
// since that's business logic, not structural validation.
export const updateUserSchema = z.object({
  role: z.enum(["user", "editor", "admin", "superadmin"]).optional(),
  newPassword: passwordSchema.optional(),
  isActive: z.boolean().optional(),
});
