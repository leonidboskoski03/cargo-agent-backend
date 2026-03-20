import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { RoutesRepository } from "./routes.repository.js";
import { createRouteSchema, listRoutesSchema, updateRouteSchema } from "./routes.validator.js";

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

type ListRoutesQuery = z.infer<typeof listRoutesSchema>["query"];
type CreateRouteBody = z.infer<typeof createRouteSchema>["body"];
type UpdateRouteBody = z.infer<typeof updateRouteSchema>["body"];

const repo = new RoutesRepository();

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

async function assertLocationsExist(originLocationId: string, destinationLocationId: string) {
  if (originLocationId === destinationLocationId) {
    throw new AppError(400, "INVALID_ROUTE", "Origin and destination must be different");
  }

  const [origin, destination] = await Promise.all([
    repo.findActiveLocationById(originLocationId),
    repo.findActiveLocationById(destinationLocationId),
  ]);

  if (!origin) {
    throw new AppError(404, "ORIGIN_LOCATION_NOT_FOUND", "Origin location not found");
  }

  if (!destination) {
    throw new AppError(404, "DESTINATION_LOCATION_NOT_FOUND", "Destination location not found");
  }
}

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

    await assertLocationsExist(body.originLocationId, body.destinationLocationId);

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

    await assertLocationsExist(originLocationId, destinationLocationId);

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

    await assertLocationsExist(existing.originLocationId, existing.destinationLocationId);

    return repo.restore(routeId);
  }
}

