import { AppError } from "../../shared/errors/AppError.js";
import { assertCompanyAdmin, assertLocationsExist, requireAuth } from "./routes.helpers.js";
import { RoutesRepository } from "./routes.repository.js";
import type { AuthContext, CreateRouteBody, CreateRouteEstimateBody, ListRoutesQuery, UpdateRouteBody } from "./routes.types.js";

const repo = new RoutesRepository();

type OrsDirectionsResponse = {
  routes?: Array<{
    summary?: {
      distance?: number;
      duration?: number;
    };
  }>;
};

function requireCompany(auth: { companyId?: string }) {
  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
  }

  return auth.companyId;
}

export class RoutesService {
  async list(auth: AuthContext, query: ListRoutesQuery) {
    requireAuth(auth);
    const companyId = requireCompany(auth);

    return repo.listActive({
      companyId,
      originLocationId: query.originLocationId,
      destinationLocationId: query.destinationLocationId,
    });
  }

  async getById(auth: AuthContext, routeId: string) {
    requireAuth(auth);
    const companyId = requireCompany(auth);

    const route = await repo.findActiveById(routeId, companyId);

    if (!route) {
      throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
    }

    return route;
  }

  async create(auth: AuthContext, body: CreateRouteBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = requireCompany(auth);

    await assertLocationsExist(repo, body.originLocationId, body.destinationLocationId);

    try {
      return await repo.create({
        companyId,
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
    const companyId = requireCompany(auth);

    const existing = await repo.findActiveById(routeId, companyId);

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
    const companyId = requireCompany(auth);

    const existing = await repo.findActiveById(routeId, companyId);

    if (!existing) {
      throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
    }

    return repo.softDelete(routeId);
  }

  async restore(auth: AuthContext, routeId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = requireCompany(auth);

    const existing = await repo.findAnyById(routeId, companyId);

    if (!existing) {
      throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
    }

    if (!existing.deletedAt) {
      throw new AppError(400, "ROUTE_NOT_DELETED", "Route is already active");
    }

    await assertLocationsExist(repo, existing.originLocationId, existing.destinationLocationId);

    return repo.restore(routeId);
  }

  async estimate(auth: AuthContext, body: CreateRouteEstimateBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const apiKey = process.env.OPENROUTESERVICE_API_KEY?.trim();
    if (!apiKey) {
      throw new AppError(503, "ROUTE_ESTIMATE_PROVIDER_NOT_CONFIGURED", "Route distance provider is not configured");
    }

    const [origin, destination] = await Promise.all([
      repo.findActiveLocationWithCoordsById(body.originLocationId),
      repo.findActiveLocationWithCoordsById(body.destinationLocationId),
    ]);

    if (!origin) {
      throw new AppError(404, "ORIGIN_LOCATION_NOT_FOUND", "Origin location not found");
    }

    if (!destination) {
      throw new AppError(404, "DESTINATION_LOCATION_NOT_FOUND", "Destination location not found");
    }

    if (origin.lat === null || origin.lng === null || destination.lat === null || destination.lng === null) {
      throw new AppError(422, "LOCATION_COORDINATES_REQUIRED", "Both locations need coordinates before route estimation");
    }

    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-hgv", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [Number(origin.lng), Number(origin.lat)],
          [Number(destination.lng), Number(destination.lat)],
        ],
        units: "km",
      }),
    });

    if (!response.ok) {
      throw new AppError(502, "ROUTE_ESTIMATE_PROVIDER_ERROR", "Route distance provider rejected the estimate request", {
        statusCode: response.status,
      });
    }

    const data = (await response.json()) as OrsDirectionsResponse;
    const summary = data.routes?.[0]?.summary;

    if (!summary?.distance || !summary.duration) {
      throw new AppError(502, "ROUTE_ESTIMATE_PROVIDER_ERROR", "Route distance provider returned an invalid estimate");
    }

    return {
      distanceKm: Math.max(1, Math.round(summary.distance)),
      estimatedDurationMinutes: Math.max(1, Math.round(summary.duration / 60)),
      provider: "OPENROUTESERVICE",
      profile: "driving-hgv",
    };
  }
}

