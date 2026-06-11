import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  createListingSchema,
  createListingInquirySchema,
  listInquiriesSchema,
  listListingsSchema,
  updateInquirySchema,
  updateListingSchema,
} from "./vehicleMarketplace.validator.js";

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

export type ListListingsQuery = z.infer<typeof listListingsSchema>["query"];
export type CreateListingBody = z.infer<typeof createListingSchema>["body"];
export type UpdateListingBody = z.infer<typeof updateListingSchema>["body"];
export type CreateListingInquiryBody = z.infer<typeof createListingInquirySchema>["body"];
export type ListInquiriesQuery = z.infer<typeof listInquiriesSchema>["query"];
export type UpdateInquiryBody = z.infer<typeof updateInquirySchema>["body"];
