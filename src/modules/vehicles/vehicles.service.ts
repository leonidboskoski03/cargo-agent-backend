import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { VehiclesRepository } from "./vehicles.repository.js";
import {
  assertAllowedRole,
  assertCanMutateVehicle,
  assertCanReadVehicle,
  requireAuth,
} from "./vehicles.helpers.js";
import type { AuthContext, CreateVehicleBody, UpdateVehicleBody } from "./vehicles.types.js";

const repo = new VehiclesRepository();


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


