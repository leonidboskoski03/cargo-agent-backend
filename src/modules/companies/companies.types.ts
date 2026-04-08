import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { updateMyCompanySchema } from "./companies.validator.js";

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

export type UpdateMyCompanyBody = z.infer<typeof updateMyCompanySchema>["body"];

