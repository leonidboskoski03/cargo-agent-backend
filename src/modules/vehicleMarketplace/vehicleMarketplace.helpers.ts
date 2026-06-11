import { UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import type { AuthContext, RequiredAuthContext } from "./vehicleMarketplace.types.js";

export function requireAuth(auth: AuthContext): RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required");
  }

  return {
    userId: auth.userId,
    role: auth.role,
    companyId: auth.companyId,
  };
}

export function isAllowedMarketplaceRole(role: UserRole) {
  return role === Roles.COMPANY_ADMIN || role === Roles.COMPANY_DRIVER || role === Roles.JOB_SEEKER;
}

export function assertCanBrowseMarketplace(role: UserRole) {
  if (!isAllowedMarketplaceRole(role)) {
    throw new AppError(403, "FORBIDDEN", "Role is not allowed to browse vehicle marketplace listings");
  }
}

export function assertCanMutateListing(auth: RequiredAuthContext) {
  if (auth.role === Roles.COMPANY_ADMIN) {
    if (!auth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }
    return;
  }

  if (auth.role === Roles.JOB_SEEKER) return;

  throw new AppError(403, "FORBIDDEN", "Role is not allowed to mutate vehicle marketplace listings");
}

export function canOwnListing(auth: RequiredAuthContext, owner: { ownerCompanyId: string | null; ownerUserId: string | null }) {
  if (auth.role === Roles.COMPANY_ADMIN) return Boolean(auth.companyId && owner.ownerCompanyId === auth.companyId);
  if (auth.role === Roles.JOB_SEEKER) return owner.ownerUserId === auth.userId;
  return false;
}

export function assertCanOwnListing(auth: RequiredAuthContext, owner: { ownerCompanyId: string | null; ownerUserId: string | null }) {
  if (!canOwnListing(auth, owner)) {
    throw new AppError(403, "FORBIDDEN", "You can only mutate your own vehicle marketplace listings");
  }
}
