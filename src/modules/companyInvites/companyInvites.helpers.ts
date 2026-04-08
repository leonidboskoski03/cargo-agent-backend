import { CompanyInviteStatus } from "@prisma/client";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext } from "./companyInvites.types.js";

export function requireAuth(auth: AuthContext) {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function requireCompanyAdmin(auth: AuthContext) {
  requireAuth(auth);

  if (auth.role !== Roles.COMPANY_ADMIN || !auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can perform this action");
  }
}

export function parseInviteStatus(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (
    normalized === CompanyInviteStatus.PENDING ||
    normalized === CompanyInviteStatus.ACCEPTED ||
    normalized === CompanyInviteStatus.REVOKED ||
    normalized === CompanyInviteStatus.EXPIRED
  ) {
    return normalized as CompanyInviteStatus;
  }

  throw new AppError(400, "INVALID_INVITE_STATUS", "Invalid invite status filter");
}

