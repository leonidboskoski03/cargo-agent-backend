import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  changeReviewStatusSchema,
  createReviewSchema,
  listReviewsSchema,
  updateReviewSchema,
} from "./reviews.validator.js";

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

export type ListReviewsQuery = z.infer<typeof listReviewsSchema>["query"];
export type CreateReviewBody = z.infer<typeof createReviewSchema>["body"];
export type UpdateReviewBody = z.infer<typeof updateReviewSchema>["body"];
export type ChangeReviewStatusBody = z.infer<typeof changeReviewStatusSchema>["body"];

