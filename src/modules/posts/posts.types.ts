import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  changePostStatusSchema,
  createPostSchema,
  listPostsSchema,
  updatePostSchema,
} from "./posts.validator.js";

export type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

export type RequiredAuthContext = {
  userId: string;
  role: UserRole;
  companyId?: string;
};

export type ListPostsQuery = z.infer<typeof listPostsSchema>["query"];
export type CreatePostBody = z.infer<typeof createPostSchema>["body"];
export type UpdatePostBody = z.infer<typeof updatePostSchema>["body"];
export type ChangePostStatusBody = z.infer<typeof changePostStatusSchema>["body"];

