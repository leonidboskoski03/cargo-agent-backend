import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext, RequiredAuthContext } from "./users.types.js";

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

export function assertCanReadUser(auth: RequiredAuthContext, targetUser: { id: string; companyId: string | null }) {
  if (targetUser.id === auth.userId) {
    return;
  }

  if (auth.role === Roles.COMPANY_ADMIN && auth.companyId && targetUser.companyId === auth.companyId) {
    return;
  }

  throw new AppError(403, "FORBIDDEN", "You do not have permission to access this user");
}

