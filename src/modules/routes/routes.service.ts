import { AppError } from "../../shared/errors/AppError.js";
import { assertCompanyAdmin, assertLocationsExist, requireAuth } from "./routes.helpers.js";
import { RoutesRepository } from "./routes.repository.js";
import type { AuthContext, CreateRouteBody, ListRoutesQuery, UpdateRouteBody } from "./routes.types.js";

const repo = new RoutesRepository();

export class RoutesService {
  async list(auth: AuthContext, query: ListRoutesQuery) {
    requireAuth(auth);

    return repo.listActive({
      originLocationId: query.originLocationId,
      destinationLocationId: query.destinationLocationId,
    });
  }

  async getById(auth: AuthContext, routeId: string) {
    requireAuth(auth);

    const route = await repo.findActiveById(routeId);

    if (!route) {
      throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
    }

    return route;
  }

  async create(auth: AuthContext, body: CreateRouteBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    await assertLocationsExist(repo, body.originLocationId, body.destinationLocationId);

    try {
      return await repo.create({
        originLocationId: body.originLocationId,
        destinationLocationId: body.destinationLocationId,
        distanceKm: body.distanceKm,
        estimatedDurationMinutes: body.estimatedDurationMinutes,
        isActive: body.isActive,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "ROUTE_ALREADY_EXISTS", "A route between these locations already exists");
      }

      throw error;
    }
  }

  async update(auth: AuthContext, routeId: string, body: UpdateRouteBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const existing = await repo.findActiveById(routeId);

    if (!existing) {
      throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
    }

    const originLocationId = body.originLocationId ?? existing.originLocationId;
    const destinationLocationId = body.destinationLocationId ?? existing.destinationLocationId;

    await assertLocationsExist(repo, originLocationId, destinationLocationId);

    try {
      return await repo.update(routeId, {
        originLocationId: body.originLocationId,
        destinationLocationId: body.destinationLocationId,
        distanceKm: body.distanceKm,
        estimatedDurationMinutes: body.estimatedDurationMinutes,
        isActive: body.isActive,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "ROUTE_ALREADY_EXISTS", "A route between these locations already exists");
      }

      throw error;
    }
  }

  async remove(auth: AuthContext, routeId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const existing = await repo.findActiveById(routeId);

    if (!existing) {
      throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
    }

    return repo.softDelete(routeId);
  }

  async restore(auth: AuthContext, routeId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const existing = await repo.findAnyById(routeId);

    if (!existing) {
      throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
    }

    if (!existing.deletedAt) {
      throw new AppError(400, "ROUTE_NOT_DELETED", "Route is already active");
    }

    await assertLocationsExist(repo, existing.originLocationId, existing.destinationLocationId);

    return repo.restore(routeId);
  }
}

