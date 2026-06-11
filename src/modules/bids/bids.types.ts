import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  boostBidSchema,
  changeBidStatusSchema,
  createBidSchema,
  listBidsSchema,
  updateBidSchema,
} from "./bids.validator.js";

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

export type ListBidsQuery = z.infer<typeof listBidsSchema>["query"];
export type CreateBidBody = z.infer<typeof createBidSchema>["body"];
export type UpdateBidBody = z.infer<typeof updateBidSchema>["body"];
export type ChangeBidStatusBody = z.infer<typeof changeBidStatusSchema>["body"];
export type BoostBidBody = z.infer<typeof boostBidSchema>["body"];

