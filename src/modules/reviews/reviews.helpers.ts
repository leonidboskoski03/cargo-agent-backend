import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext, RequiredAuthContext } from "./reviews.types.js";

export function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function assertCompanyUser(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN && auth.role !== Roles.COMPANY_DRIVER) {
    throw new AppError(403, "FORBIDDEN", "Only company users can access reviews");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
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

