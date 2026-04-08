import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext } from "./documents.service.types.js";

export function requireAuth(auth: AuthContext) {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function assertAccess(auth: AuthContext, doc: { ownerUserId: string | null; ownerCompanyId: string | null }) {
  if (auth.role === Roles.JOB_SEEKER) {
    if (doc.ownerUserId !== auth.userId) {
      throw new AppError(403, "FORBIDDEN", "You can only access your own documents");
    }

    return;
  }

  if (!auth.companyId || doc.ownerCompanyId !== auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "You can only access company documents in your scope");
  }
}

