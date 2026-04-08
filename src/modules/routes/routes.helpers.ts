import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import { RoutesRepository } from "./routes.repository.js";
import type { AuthContext, RequiredAuthContext } from "./routes.types.js";

export function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function assertCompanyAdmin(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can perform this action");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
  }
}

export async function assertLocationsExist(repo: RoutesRepository, originLocationId: string, destinationLocationId: string) {
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


