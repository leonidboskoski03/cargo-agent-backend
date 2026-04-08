import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext, CompanyAdminAuth } from "./auditLogs.service.types.js";

export function requireCompanyAdmin(auth: AuthContext): asserts auth is CompanyAdminAuth {
  if (!auth.userId || auth.role !== Roles.COMPANY_ADMIN || !auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can access audit logs");
  }
}

