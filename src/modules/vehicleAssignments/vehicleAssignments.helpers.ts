import type { UserRole } from "@prisma/client";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import { VehicleAssignmentsRepository } from "./vehicleAssignments.repository.js";
import type { AuthContext, RequiredAuthContext } from "./vehicleAssignments.types.js";

export function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function assertAllowedRole(role: UserRole) {
  if (![Roles.COMPANY_ADMIN, Roles.COMPANY_DRIVER, Roles.JOB_SEEKER].includes(role)) {
    throw new AppError(403, "FORBIDDEN", "Role is not allowed to access vehicle assignments");
  }
}

export function assertCanReadAssignment(
  auth: RequiredAuthContext,
  assignment: {
    driverUserId: string;
    vehicle: { companyId: string | null; userId: string | null };
  },
) {
  const vehicleCompanyId = assignment.vehicle.companyId;

  if (vehicleCompanyId) {
    if (auth.role !== Roles.COMPANY_ADMIN && auth.role !== Roles.COMPANY_DRIVER) {
      throw new AppError(403, "FORBIDDEN", "You cannot access company vehicle assignments");
    }

    if (!auth.companyId || auth.companyId !== vehicleCompanyId) {
      throw new AppError(403, "FORBIDDEN", "You can only access assignments in your company");
    }

    return;
  }

  if (auth.role !== Roles.JOB_SEEKER) {
    throw new AppError(403, "FORBIDDEN", "Only job seekers can access personal assignments");
  }

  if (assignment.driverUserId !== auth.userId || assignment.vehicle.userId !== auth.userId) {
    throw new AppError(403, "FORBIDDEN", "You can only access your own personal assignments");
  }
}

export async function assertCanMutateTarget(
  repo: VehicleAssignmentsRepository,
  auth: RequiredAuthContext,
  input: {
    vehicleId: string;
    driverUserId: string;
  },
) {
  if (auth.role === Roles.COMPANY_DRIVER) {
    throw new AppError(403, "FORBIDDEN", "Company drivers cannot modify assignments");
  }

  const vehicle = await repo.findActiveVehicleById(input.vehicleId);
  if (!vehicle) {
    throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found");
  }

  const driver = await repo.findActiveUserById(input.driverUserId);
  if (!driver) {
    throw new AppError(404, "USER_NOT_FOUND", "Driver user not found");
  }

  if (auth.role === Roles.COMPANY_ADMIN) {
    if (!auth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    if (vehicle.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only assign vehicles from your company");
    }

    if (driver.companyId !== auth.companyId || driver.role !== Roles.COMPANY_DRIVER) {
      throw new AppError(403, "FORBIDDEN", "Assigned driver must be a company driver in your company");
    }

    return;
  }

  if (auth.role === Roles.JOB_SEEKER) {
    if (vehicle.userId !== auth.userId || vehicle.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only assign your own personal vehicles");
    }

    if (driver.id !== auth.userId || driver.role !== Roles.JOB_SEEKER || driver.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only assign yourself as driver for personal vehicles");
    }

    return;
  }

  throw new AppError(403, "FORBIDDEN", "Role is not allowed to modify assignments");
}


