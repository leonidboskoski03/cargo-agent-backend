import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { LocationsRepository } from "./locations.repository.js";
import {
  createLocationSchema,
  listLocationsSchema,
  updateLocationSchema,
} from "./locations.validator.js";

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

type ListLocationsQuery = z.infer<typeof listLocationsSchema>["query"];
type CreateLocationBody = z.infer<typeof createLocationSchema>["body"];
type UpdateLocationBody = z.infer<typeof updateLocationSchema>["body"];

const repo = new LocationsRepository();

function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function assertCompanyAdmin(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can perform this action");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
  }
}

export class LocationsService {
  async list(auth: AuthContext, query: ListLocationsQuery) {
    requireAuth(auth);

    return repo.listActive({
      countryCode: query.countryCode?.toUpperCase(),
      city: query.city,
    });
  }

  async getById(auth: AuthContext, locationId: string) {
    requireAuth(auth);

    const location = await repo.findActiveById(locationId);

    if (!location) {
      throw new AppError(404, "LOCATION_NOT_FOUND", "Location not found");
    }

    return location;
  }

  async create(auth: AuthContext, body: CreateLocationBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    return repo.create({
      countryCode: body.countryCode.toUpperCase(),
      city: body.city,
      region: body.region,
      postalCode: body.postalCode,
      lat: body.lat,
      lng: body.lng,
    });
  }

  async update(auth: AuthContext, locationId: string, body: UpdateLocationBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const existing = await repo.findActiveById(locationId);

    if (!existing) {
      throw new AppError(404, "LOCATION_NOT_FOUND", "Location not found");
    }

    return repo.update(locationId, {
      countryCode: body.countryCode?.toUpperCase(),
      city: body.city,
      region: body.region,
      postalCode: body.postalCode,
      lat: body.lat,
      lng: body.lng,
    });
  }

  async remove(auth: AuthContext, locationId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const existing = await repo.findActiveById(locationId);

    if (!existing) {
      throw new AppError(404, "LOCATION_NOT_FOUND", "Location not found");
    }

    return repo.softDelete(locationId);
  }

  async restore(auth: AuthContext, locationId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const existing = await repo.findAnyById(locationId);

    if (!existing) {
      throw new AppError(404, "LOCATION_NOT_FOUND", "Location not found");
    }

    if (!existing.deletedAt) {
      throw new AppError(400, "LOCATION_NOT_DELETED", "Location is already active");
    }

    return repo.restore(locationId);
  }
}

