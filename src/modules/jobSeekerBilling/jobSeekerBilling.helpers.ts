import { UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext } from "./jobSeekerBilling.types.js";

export function getCurrentMonthPeriodStartUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function requireJobSeeker(auth: AuthContext) {
  if (!auth.userId || auth.role !== UserRole.JOB_SEEKER) {
    throw new AppError(403, "FORBIDDEN", "Only job seekers can access this resource");
  }
}

export function requireCompanyAdmin(auth: AuthContext) {
  if (!auth.userId || auth.role !== UserRole.COMPANY_ADMIN || !auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can access this resource");
  }
}

