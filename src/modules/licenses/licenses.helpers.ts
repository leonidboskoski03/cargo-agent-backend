import type { UserRole } from "@prisma/client";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext, RequiredAuthContext } from "./licenses.types.js";

export function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function assertAllowedRole(role: UserRole) {
  if (![Roles.COMPANY_ADMIN, Roles.COMPANY_DRIVER, Roles.JOB_SEEKER].includes(role)) {
    throw new AppError(403, "FORBIDDEN", "Role is not allowed to manage licenses");
  }
}

export function assertCanManageLicenseUser(auth: RequiredAuthContext, targetUser: { id: string; companyId: string | null }) {
  if (auth.role === Roles.COMPANY_ADMIN) {
    if (!auth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    if (targetUser.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only manage users in your company");
    }

    return;
  }

  if (targetUser.id !== auth.userId) {
    throw new AppError(403, "FORBIDDEN", "You can only manage your own licenses");
  }
}

