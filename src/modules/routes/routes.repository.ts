import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type RouteListFilters = {
  companyId: string;
  deleted?: "active" | "only" | "include";
  originLocationId?: string;
  destinationLocationId?: string;
};

type RouteCreateData = {
  companyId: string;
  originLocationId: string;
  destinationLocationId: string;
  distanceKm?: number;
  estimatedDurationMinutes?: number;
  isActive?: boolean;
};

type RouteUpdateData = {
  originLocationId?: string;
  destinationLocationId?: string;
  distanceKm?: number | null;
  estimatedDurationMinutes?: number | null;
  isActive?: boolean;
};

const routeSelect = {
  id: true,
  companyId: true,
  originLocationId: true,
  destinationLocationId: true,
  distanceKm: true,
  estimatedDurationMinutes: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  originLocation: {
    select: {
      id: true,
      countryCode: true,
      city: true,
      deletedAt: true,
    },
  },
  destinationLocation: {
    select: {
      id: true,
      countryCode: true,
      city: true,
      deletedAt: true,
    },
  },
} as const;

function routeDeletedWhere(deleted: RouteListFilters["deleted"]): Prisma.RouteWhereInput {
  if (deleted === "only") return { deletedAt: { not: null } };
  if (deleted === "include") return {};
  return { deletedAt: null };
}

export class RoutesRepository {
  async list(filters: RouteListFilters) {
    return prisma.route.findMany({
      where: {
        companyId: filters.companyId,
        ...routeDeletedWhere(filters.deleted ?? "active"),
        ...(filters.originLocationId ? { originLocationId: filters.originLocationId } : {}),
        ...(filters.destinationLocationId ? { destinationLocationId: filters.destinationLocationId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: routeSelect,
    });
  }

  async findActiveById(routeId: string, companyId: string) {
    return prisma.route.findFirst({
      where: {
        id: routeId,
        companyId,
        deletedAt: null,
      },
      select: routeSelect,
    });
  }

  async findAnyById(routeId: string, companyId: string) {
    return prisma.route.findFirst({
      where: { id: routeId, companyId },
      select: routeSelect,
    });
  }

  async findActiveLocationById(locationId: string, companyId: string) {
    return prisma.location.findFirst({
      where: {
        id: locationId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  async findActiveLocationWithCoordsById(locationId: string, companyId: string) {
    return prisma.location.findFirst({
      where: {
        id: locationId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        countryCode: true,
        city: true,
        lat: true,
        lng: true,
      },
    });
  }

  async create(data: RouteCreateData) {
    return prisma.route.create({
      data,
      select: routeSelect,
    });
  }

  async update(routeId: string, data: RouteUpdateData) {
    return prisma.route.update({
      where: { id: routeId },
      data,
      select: routeSelect,
    });
  }

  async softDelete(routeId: string) {
    return prisma.route.update({
      where: { id: routeId },
      data: {
        deletedAt: new Date(),
      },
      select: routeSelect,
    });
  }

  async restore(routeId: string) {
    return prisma.route.update({
      where: { id: routeId },
      data: {
        deletedAt: null,
      },
      select: routeSelect,
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

