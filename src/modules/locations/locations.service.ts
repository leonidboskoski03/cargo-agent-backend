import type { UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import { assertCompanyAdmin, requireAuth } from "./locations.helpers.js";
import { LocationsRepository } from "./locations.repository.js";
import type {
  AuthContext,
  CreateLocationBody,
  ListLocationsQuery,
  UpdateLocationBody,
} from "./locations.types.js";

const repo = new LocationsRepository();


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

