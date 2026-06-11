import { UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext } from "./companyCredits.types.js";

export function requireCompanyUser(auth: AuthContext) {
  if (!auth.userId || !auth.companyId || (auth.role !== UserRole.COMPANY_ADMIN && auth.role !== UserRole.COMPANY_DRIVER)) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company user context is required");
  }
}

export function requireCompanyAdmin(auth: AuthContext) {
  if (!auth.userId || !auth.companyId || auth.role !== UserRole.COMPANY_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Company admin access is required");
  }
}
