import {z} from "zod";

export const createCommentSchema = z.object({
  newsId: z.string().nonempty("News ID is required"),
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
