import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { VehiclesRepository } from "./vehicles.repository.js";
import { createVehicleSchema, updateVehicleSchema } from "./vehicles.validator.js";

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

type CreateVehicleBody = z.infer<typeof createVehicleSchema>["body"];
type UpdateVehicleBody = z.infer<typeof updateVehicleSchema>["body"];

const repo = new VehiclesRepository();

function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function assertAllowedRole(role: UserRole) {
  if (![Roles.COMPANY_ADMIN, Roles.COMPANY_DRIVER, Roles.JOB_SEEKER].includes(role)) {
    throw new AppError(403, "FORBIDDEN", "Role is not allowed to access vehicles");
  }
}

function assertCanReadVehicle(auth: RequiredAuthContext, vehicle: { companyId: string | null; userId: string | null }) {
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

function assertCanMutateVehicle(auth: RequiredAuthContext, vehicle: { companyId: string | null; userId: string | null }) {
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

export class VehiclesService {
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

  async getById(auth: AuthContext, vehicleId: string) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const vehicle = await repo.findActiveById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found");
    }

    assertCanReadVehicle(auth, {
      companyId: vehicle.companyId,
      userId: vehicle.userId,
    });

    return vehicle;
  }

  async create(auth: AuthContext, body: CreateVehicleBody) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    if (auth.role === Roles.COMPANY_DRIVER) {
      throw new AppError(403, "FORBIDDEN", "Company drivers cannot create vehicles");
    }

    const ownership =
      auth.role === Roles.COMPANY_ADMIN
        ? {
            companyId: auth.companyId,
            userId: null,
          }
        : {
            companyId: null,
            userId: auth.userId,
          };

    if (auth.role === Roles.COMPANY_ADMIN && !ownership.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    try {
      return await repo.create({
        companyId: ownership.companyId,
        userId: ownership.userId,
        vehicleType: body.vehicleType,
        plateNumber: body.plateNumber,
        countryOfRegistration: body.countryOfRegistration.toUpperCase(),
        brand: body.brand,
        model: body.model,
        year: body.year,
        capacityKg: body.capacityKg,
        volumeM3: body.volumeM3,
        bodyType: body.bodyType,
        refrigerated: body.refrigerated,
        hazmatCertified: body.hazmatCertified,
        isActive: body.isActive,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "DUPLICATE_VEHICLE", "Vehicle with this plate and country already exists");
      }

      throw error;
    }
  }

  async update(auth: AuthContext, vehicleId: string, body: UpdateVehicleBody) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const vehicle = await repo.findActiveById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found");
    }

    assertCanMutateVehicle(auth, {
      companyId: vehicle.companyId,
      userId: vehicle.userId,
    });

    try {
      return await repo.update(vehicleId, {
        vehicleType: body.vehicleType,
        plateNumber: body.plateNumber,
        countryOfRegistration: body.countryOfRegistration?.toUpperCase(),
        brand: body.brand,
        model: body.model,
        year: body.year,
        capacityKg: body.capacityKg,
        volumeM3: body.volumeM3,
        bodyType: body.bodyType,
        refrigerated: body.refrigerated,
        hazmatCertified: body.hazmatCertified,
        isActive: body.isActive,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "DUPLICATE_VEHICLE", "Vehicle with this plate and country already exists");
      }

      throw error;
    }
  }

  async remove(auth: AuthContext, vehicleId: string) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const vehicle = await repo.findActiveById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found");
    }

    assertCanMutateVehicle(auth, {
      companyId: vehicle.companyId,
      userId: vehicle.userId,
    });

    return repo.softDelete(vehicleId);
  }

  async restore(auth: AuthContext, vehicleId: string) {
    requireAuth(auth);

    if (auth.role !== Roles.COMPANY_ADMIN) {
      throw new AppError(403, "FORBIDDEN", "Only company admins can restore vehicles");
    }

    if (!auth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const vehicle = await repo.findAnyById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found");
    }

    if (!vehicle.deletedAt) {
      throw new AppError(400, "VEHICLE_NOT_DELETED", "Vehicle is already active");
    }

    if (vehicle.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only restore vehicles from your company");
    }

    return repo.restore(vehicleId);
  }
}


