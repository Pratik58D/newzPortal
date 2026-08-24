import {z} from "zod";

export const createCommentSchema = z.object({
  newsId: z.string().nonempty("News ID is required"),

  username: z.
  string()
  .trim()
  .min(2, "Username must be at least 2 characters")
  .max(50, "Username must not exceed 50 characters"),

  userEmail: z
  .string()
  .email("Please provide a valid email address")
  .max(255, "Email address is too long")
  .transform((email) => email.toLowerCase()),
  
  commentText: z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(2000, "Comment must not exceed 2000 characters"),
});


export const updateCommentSchema = z.object({
  commentText: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must not exceed 2000 characters"),
});


export const updateCommentStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});