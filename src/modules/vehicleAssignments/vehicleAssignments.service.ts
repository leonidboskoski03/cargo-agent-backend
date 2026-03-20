import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import {
  createVehicleAssignmentSchema,
  updateVehicleAssignmentSchema,
} from "./vehicleAssignments.validator.js";
import { VehicleAssignmentsRepository } from "./vehicleAssignments.repository.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

type RequiredAuthContext = {
  userId: string;
  role: UserRole;
  companyId?: string;
};

type CreateAssignmentBody = z.infer<typeof createVehicleAssignmentSchema>["body"];
type UpdateAssignmentBody = z.infer<typeof updateVehicleAssignmentSchema>["body"];

const repo = new VehicleAssignmentsRepository();

function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function assertAllowedRole(role: UserRole) {
  if (![Roles.COMPANY_ADMIN, Roles.COMPANY_DRIVER, Roles.JOB_SEEKER].includes(role)) {
    throw new AppError(403, "FORBIDDEN", "Role is not allowed to access vehicle assignments");
  }
}

function assertCanReadAssignment(
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

async function assertCanMutateTarget(
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

export class VehicleAssignmentsService {
  async list(auth: AuthContext) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    if (auth.role === Roles.COMPANY_ADMIN || auth.role === Roles.COMPANY_DRIVER) {
      if (!auth.companyId) {
        throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
      }

      return repo.listActiveByCompany(auth.companyId);
    }

    return repo.listActiveByUser(auth.userId);
  }

  async getById(auth: AuthContext, assignmentId: string) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const assignment = await repo.findActiveById(assignmentId);

    if (!assignment) {
      throw new AppError(404, "VEHICLE_ASSIGNMENT_NOT_FOUND", "Vehicle assignment not found");
    }

    assertCanReadAssignment(auth, {
      driverUserId: assignment.driverUserId,
      vehicle: {
        companyId: assignment.vehicle.companyId,
        userId: assignment.vehicle.userId,
      },
    });

    return assignment;
  }

  async create(auth: AuthContext, body: CreateAssignmentBody) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    await assertCanMutateTarget(auth, {
      vehicleId: body.vehicleId,
      driverUserId: body.driverUserId,
    });

    const overlap = await repo.hasDriverOverlap({
      driverUserId: body.driverUserId,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });

    if (overlap) {
      throw new AppError(409, "DRIVER_ALREADY_ASSIGNED", "Driver already has an overlapping assignment");
    }

    try {
      return await repo.create({
        vehicleId: body.vehicleId,
        driverUserId: body.driverUserId,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      });
    } catch (error) {
      if (repo.isConstraintConflict(error)) {
        throw new AppError(409, "DRIVER_ALREADY_ASSIGNED", "Driver already has an overlapping assignment");
      }

      throw error;
    }
  }

  async update(auth: AuthContext, assignmentId: string, body: UpdateAssignmentBody) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const assignment = await repo.findActiveById(assignmentId);

    if (!assignment) {
      throw new AppError(404, "VEHICLE_ASSIGNMENT_NOT_FOUND", "Vehicle assignment not found");
    }

    const candidateVehicleId = body.vehicleId ?? assignment.vehicleId;
    const candidateDriverUserId = body.driverUserId ?? assignment.driverUserId;
    const candidateStartsAt = body.startsAt ?? assignment.startsAt;
    const candidateEndsAt = body.endsAt === undefined ? assignment.endsAt : body.endsAt;

    if (candidateEndsAt && candidateEndsAt <= candidateStartsAt) {
      throw new AppError(400, "INVALID_TIME_WINDOW", "endsAt must be after startsAt");
    }

    await assertCanMutateTarget(auth, {
      vehicleId: candidateVehicleId,
      driverUserId: candidateDriverUserId,
    });

    const overlap = await repo.hasDriverOverlap({
      driverUserId: candidateDriverUserId,
      startsAt: candidateStartsAt,
      endsAt: candidateEndsAt,
      excludeAssignmentId: assignmentId,
    });

    if (overlap) {
      throw new AppError(409, "DRIVER_ALREADY_ASSIGNED", "Driver already has an overlapping assignment");
    }

    try {
      return await repo.update(assignmentId, {
        vehicleId: body.vehicleId,
        driverUserId: body.driverUserId,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      });
    } catch (error) {
      if (repo.isConstraintConflict(error)) {
        throw new AppError(409, "DRIVER_ALREADY_ASSIGNED", "Driver already has an overlapping assignment");
      }

      throw error;
    }
  }

  async remove(auth: AuthContext, assignmentId: string) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const assignment = await repo.findActiveById(assignmentId);

    if (!assignment) {
      throw new AppError(404, "VEHICLE_ASSIGNMENT_NOT_FOUND", "Vehicle assignment not found");
    }

    assertCanReadAssignment(auth, {
      driverUserId: assignment.driverUserId,
      vehicle: {
        companyId: assignment.vehicle.companyId,
        userId: assignment.vehicle.userId,
      },
    });

    if (auth.role === Roles.COMPANY_DRIVER) {
      throw new AppError(403, "FORBIDDEN", "Company drivers cannot delete assignments");
    }

    return repo.softDelete(assignmentId);
  }

  async restore(auth: AuthContext, assignmentId: string) {
    requireAuth(auth);

    if (auth.role !== Roles.COMPANY_ADMIN) {
      throw new AppError(403, "FORBIDDEN", "Only company admins can restore assignments");
    }

    if (!auth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const assignment = await repo.findAnyById(assignmentId);

    if (!assignment) {
      throw new AppError(404, "VEHICLE_ASSIGNMENT_NOT_FOUND", "Vehicle assignment not found");
    }

    if (!assignment.deletedAt) {
      throw new AppError(400, "VEHICLE_ASSIGNMENT_NOT_DELETED", "Vehicle assignment is already active");
    }

    if (assignment.vehicle.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only restore assignments from your company");
    }

    const overlap = await repo.hasDriverOverlap({
      driverUserId: assignment.driverUserId,
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      excludeAssignmentId: assignment.id,
    });

    if (overlap) {
      throw new AppError(409, "DRIVER_ALREADY_ASSIGNED", "Driver already has an overlapping assignment");
    }

    try {
      return await repo.restore(assignmentId);
    } catch (error) {
      if (repo.isConstraintConflict(error)) {
        throw new AppError(409, "DRIVER_ALREADY_ASSIGNED", "Driver already has an overlapping assignment");
      }

      throw error;
    }
  }
}

