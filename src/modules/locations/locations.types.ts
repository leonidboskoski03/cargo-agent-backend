import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  createLocationSchema,
  listLocationsSchema,
  updateLocationSchema,
} from "./locations.validator.js";

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

export type ListLocationsQuery = z.infer<typeof listLocationsSchema>["query"];
export type CreateLocationBody = z.infer<typeof createLocationSchema>["body"];
export type UpdateLocationBody = z.infer<typeof updateLocationSchema>["body"];

