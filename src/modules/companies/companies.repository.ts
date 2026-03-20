import { CompanyType, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type CompanyUpdateData = {
  companyType?: CompanyType;
  name?: string;
  countryCode?: string;
  city?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  foundedAt?: Date | null;
  employeeCount?: number | null;
  isVerified?: boolean;
  registrationNumber?: string;
  vatNumber?: string | null;
  stripeCustomerId?: string | null;
};

const companySelect = {
  id: true,
  companyType: true,
  name: true,
  registrationNumber: true,
  vatNumber: true,
  countryCode: true,
  city: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  logoUrl: true,
  bannerUrl: true,
  bio: true,
  foundedAt: true,
  employeeCount: true,
  isVerified: true,
  stripeCustomerId: true,
  currentPlanId: true,
  subscriptionStatus: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class CompaniesRepository {
  async findActiveById(companyId: string) {
    return prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: companySelect,
    });
  }

  async findAnyById(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId },
      select: companySelect,
    });
  }

  async update(companyId: string, data: CompanyUpdateData) {
    return prisma.company.update({
      where: { id: companyId },
      data,
      select: companySelect,
    });
  }

  async softDelete(companyId: string) {
    return prisma.company.update({
      where: { id: companyId },
      data: {
        deletedAt: new Date(),
      },
      select: companySelect,
    });
  }

  async restore(companyId: string) {
    return prisma.company.update({
      where: { id: companyId },
      data: {
        deletedAt: null,
      },
      select: companySelect,
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}


