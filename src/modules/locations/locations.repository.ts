import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type LocationListFilters = {
  companyId: string;
  countryCode?: string;
  city?: string;
  deleted?: "active" | "only" | "include";
};

type LocationCreateData = {
  companyId: string;
  countryCode: string;
  city: string;
  region?: string;
  postalCode?: string;
  lat?: Prisma.Decimal | string | number;
  lng?: Prisma.Decimal | string | number;
};

type LocationUpdateData = {
  countryCode?: string;
  city?: string;
  region?: string | null;
  postalCode?: string | null;
  lat?: Prisma.Decimal | string | number | null;
  lng?: Prisma.Decimal | string | number | null;
};

const locationSelect = {
  id: true,
  companyId: true,
  countryCode: true,
  city: true,
  region: true,
  postalCode: true,
  lat: true,
  lng: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class LocationsRepository {
  async list(filters: LocationListFilters) {
    return prisma.location.findMany({
      where: {
        companyId: filters.companyId,
        ...(filters.deleted === "only" ? { deletedAt: { not: null } } : {}),
        ...(!filters.deleted || filters.deleted === "active" ? { deletedAt: null } : {}),
        ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
        ...(filters.city ? { city: { contains: filters.city, mode: "insensitive" } } : {}),
      },
      orderBy: filters.deleted === "only" ? [{ deletedAt: "desc" }] : [{ countryCode: "asc" }, { city: "asc" }],
      select: locationSelect,
    });
  }

  async findActiveById(locationId: string, companyId: string) {
    return prisma.location.findFirst({
      where: {
        id: locationId,
        companyId,
        deletedAt: null,
      },
      select: locationSelect,
    });
  }

  async findAnyById(locationId: string, companyId: string) {
    return prisma.location.findFirst({
      where: { id: locationId, companyId },
      select: locationSelect,
    });
  }

  async create(data: LocationCreateData) {
    return prisma.location.create({
      data,
      select: locationSelect,
    });
  }

  async update(locationId: string, data: LocationUpdateData) {
    return prisma.location.update({
      where: { id: locationId },
      data,
      select: locationSelect,
    });
  }

  async softDelete(locationId: string) {
    return prisma.location.update({
      where: { id: locationId },
      data: {
        deletedAt: new Date(),
      },
      select: locationSelect,
    });
  }

  async restore(locationId: string) {
    return prisma.location.update({
      where: { id: locationId },
      data: {
        deletedAt: null,
      },
      select: locationSelect,
    });
  }
}

