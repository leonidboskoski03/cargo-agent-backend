import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext, RequiredAuthContext } from "./locations.types.js";

export function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function assertCompanyAdmin(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can perform this action");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
  }
}

