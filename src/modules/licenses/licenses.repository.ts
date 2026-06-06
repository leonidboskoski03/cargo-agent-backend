import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type LicenseCreateData = {
  userId: string;
  licenseType: string;
  imageUrl?: string;
  documentUrl?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  isValid?: boolean;
};

type LicenseUpdateData = {
  licenseType?: string;
  imageUrl?: string | null;
  documentUrl?: string | null;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  isValid?: boolean;
};

const licenseSelect = {
  id: true,
  userId: true,
  licenseType: true,
  imageUrl: true,
  documentUrl: true,
  issuedAt: true,
  expiresAt: true,
  isValid: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      role: true,
      companyId: true,
    },
  },
} as const;

const userSelect = {
  id: true,
  role: true,
  companyId: true,
  deletedAt: true,
} as const;

export class LicensesRepository {
  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
  }

  async listActiveByUser(userId: string) {
    return prisma.license.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: licenseSelect,
    });
  }

  async listActiveByCompany(companyId: string, userId?: string) {
    return prisma.license.findMany({
      where: {
        deletedAt: null,
        userId,
        user: {
          companyId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: "desc" },
      select: licenseSelect,
    });
  }

  async findActiveById(licenseId: string) {
    return prisma.license.findFirst({
      where: {
        id: licenseId,
        deletedAt: null,
      },
      select: licenseSelect,
    });
  }

  async findAnyById(licenseId: string) {
    return prisma.license.findUnique({
      where: { id: licenseId },
      select: licenseSelect,
    });
  }

  async create(data: LicenseCreateData) {
    return prisma.license.create({
      data: {
        userId: data.userId,
        licenseType: data.licenseType,
        imageUrl: data.imageUrl,
        documentUrl: data.documentUrl,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        isValid: data.isValid,
      },
      select: licenseSelect,
    });
  }

  async update(licenseId: string, data: LicenseUpdateData) {
    return prisma.license.update({
      where: { id: licenseId },
      data,
      select: licenseSelect,
    });
  }

  async softDelete(licenseId: string) {
    return prisma.license.update({
      where: { id: licenseId },
      data: {
        deletedAt: new Date(),
      },
      select: licenseSelect,
    });
  }

  async restore(licenseId: string) {
    return prisma.license.update({
      where: { id: licenseId },
      data: {
        deletedAt: null,
      },
      select: licenseSelect,
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

