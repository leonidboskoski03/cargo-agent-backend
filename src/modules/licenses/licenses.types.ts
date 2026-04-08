import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  createLicenseSchema,
  listLicensesSchema,
  updateLicenseSchema,
} from "./licenses.validator.js";

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

export type CreateLicenseBody = z.infer<typeof createLicenseSchema>["body"];
export type UpdateLicenseBody = z.infer<typeof updateLicenseSchema>["body"];
export type ListLicensesQuery = z.infer<typeof listLicensesSchema>["query"];

