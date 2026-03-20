import { Prisma, VehicleBodyType, VehicleType } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type VehicleCreateData = {
  companyId?: string | null;
  userId?: string | null;
  vehicleType: VehicleType;
  plateNumber: string;
  countryOfRegistration: string;
  brand?: string;
  model?: string;
  year?: number;
  capacityKg?: number;
  volumeM3?: Prisma.Decimal | string | number;
  bodyType?: VehicleBodyType;
  refrigerated?: boolean;
  hazmatCertified?: boolean;
  isActive?: boolean;
};

type VehicleUpdateData = {
  vehicleType?: VehicleType;
  plateNumber?: string;
  countryOfRegistration?: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  capacityKg?: number | null;
  volumeM3?: Prisma.Decimal | string | number | null;
  bodyType?: VehicleBodyType | null;
  refrigerated?: boolean;
  hazmatCertified?: boolean;
  isActive?: boolean;
};

const vehicleSelect = {
  id: true,
  companyId: true,
  userId: true,
  vehicleType: true,
  plateNumber: true,
  countryOfRegistration: true,
  brand: true,
  model: true,
  year: true,
  capacityKg: true,
  volumeM3: true,
  bodyType: true,
  refrigerated: true,
  hazmatCertified: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class VehiclesRepository {
  async listActiveByCompany(companyId: string) {
    return prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: vehicleSelect,
    });
  }

  async listActiveByUser(userId: string) {
    return prisma.vehicle.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: vehicleSelect,
    });
  }

  async findActiveById(vehicleId: string) {
    return prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        deletedAt: null,
      },
      select: vehicleSelect,
    });
  }

  async findAnyById(vehicleId: string) {
    return prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: vehicleSelect,
    });
  }

  async create(data: VehicleCreateData) {
    return prisma.vehicle.create({
      data,
      select: vehicleSelect,
    });
  }

  async update(vehicleId: string, data: VehicleUpdateData) {
    return prisma.vehicle.update({
      where: { id: vehicleId },
      data,
      select: vehicleSelect,
    });
  }

  async softDelete(vehicleId: string) {
    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date() },
      select: vehicleSelect,
    });
  }

  async restore(vehicleId: string) {
    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: null },
      select: vehicleSelect,
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}


