import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

const userSelect = {
  id: true,
  companyId: true,
  role: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type UserProfileUpdateData = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  isActive?: boolean;
};

type UserMembershipUpdateData = {
  role: UserRole;
  companyId: string | null;
};

export class UsersRepository {
  async findCompanyById(companyId: string) {
    return prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  }

  async findActiveById(userId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: userSelect,
    });
  }

  async findAnyById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
  }

  async listForCompany(companyId: string, includeInactive: boolean) {
    return prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "desc" },
      select: userSelect,
    });
  }

  async listPersonalUser(userId: string) {
    return prisma.user.findMany({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: userSelect,
    });
  }

  async updateProfile(userId: string, data: UserProfileUpdateData) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
  }

  async updateMembership(userId: string, data: UserMembershipUpdateData) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
  }

  async softDelete(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: userSelect,
    });
  }

  async restore(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
      },
      select: userSelect,
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}


