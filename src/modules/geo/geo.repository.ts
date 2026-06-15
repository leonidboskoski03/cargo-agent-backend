import { prisma } from "../../shared/prisma/prismaClient.js";

export class GeoRepository {
  listCountries() {
    return prisma.supportedCountry.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        code: true,
        displayName: true,
        lat: true,
        lng: true,
        name: true,
        nativeName: true,
        region: true,
      },
    });
  }

  listCities(input: { countryCode?: string; q?: string; pageSize: number }) {
    return prisma.supportedCity.findMany({
      where: {
        isActive: true,
        ...(input.countryCode ? { countryCode: input.countryCode } : {}),
        ...(input.q ? { name: { contains: input.q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ countryCode: "asc" }, { name: "asc" }],
      take: input.pageSize,
      select: {
        id: true,
        countryCode: true,
        adminCode: true,
        displayName: true,
        name: true,
        region: true,
        lat: true,
        lng: true,
      },
    });
  }
}
