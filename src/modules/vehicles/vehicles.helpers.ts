import type { UserRole } from "@prisma/client";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext, RequiredAuthContext } from "./vehicles.types.js";

export function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function assertAllowedRole(role: UserRole) {
  if (![Roles.COMPANY_ADMIN, Roles.COMPANY_DRIVER, Roles.JOB_SEEKER].includes(role)) {
    throw new AppError(403, "FORBIDDEN", "Role is not allowed to access vehicles");
  }
}

export function assertCanReadVehicle(auth: RequiredAuthContext, vehicle: { companyId: string | null; userId: string | null }) {
  if (vehicle.companyId) {
    if (auth.role !== Roles.COMPANY_ADMIN && auth.role !== Roles.COMPANY_DRIVER) {
      throw new AppError(403, "FORBIDDEN", "You cannot access company vehicles");
    }

    if (!auth.companyId || auth.companyId !== vehicle.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only access vehicles from your company");
    }

    return;
  }

  if (vehicle.userId !== auth.userId) {
    throw new AppError(403, "FORBIDDEN", "You can only access your own vehicles");
  }
}

export function assertCanMutateVehicle(auth: RequiredAuthContext, vehicle: { companyId: string | null; userId: string | null }) {
  if (auth.role === Roles.COMPANY_DRIVER) {
    throw new AppError(403, "FORBIDDEN", "Company drivers cannot modify vehicles");
  }

  if (auth.role === Roles.COMPANY_ADMIN) {
    if (!auth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    if (vehicle.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only manage vehicles in your company");
    }

    return;
  }

  if (vehicle.userId !== auth.userId || vehicle.companyId) {
    throw new AppError(403, "FORBIDDEN", "You can only manage your own personal vehicles");
  }
}

