import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type AssignmentCreateData = {
  vehicleId: string;
  driverUserId: string;
  startsAt: Date;
  endsAt?: Date | null;
};

type AssignmentUpdateData = {
  vehicleId?: string;
  driverUserId?: string;
  startsAt?: Date;
  endsAt?: Date | null;
};

const assignmentSelect = {
  id: true,
  vehicleId: true,
  driverUserId: true,
  startsAt: true,
  endsAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  vehicle: {
    select: {
      id: true,
      companyId: true,
      userId: true,
      deletedAt: true,
    },
  },
  driverUser: {
    select: {
      id: true,
      role: true,
      companyId: true,
      deletedAt: true,
    },
  },
} as const;

export class VehicleAssignmentsRepository {
  async listActiveByCompany(companyId: string) {
    return prisma.vehicleAssignment.findMany({
      where: {
        deletedAt: null,
        vehicle: {
          companyId,
          deletedAt: null,
        },
      },
      orderBy: { startsAt: "desc" },
      select: assignmentSelect,
    });
  }

  async listActiveByUser(userId: string) {
    return prisma.vehicleAssignment.findMany({
      where: {
        deletedAt: null,
        driverUserId: userId,
      },
      orderBy: { startsAt: "desc" },
      select: assignmentSelect,
    });
  }

  async findActiveById(assignmentId: string) {
    return prisma.vehicleAssignment.findFirst({
      where: {
        id: assignmentId,
        deletedAt: null,
      },
      select: assignmentSelect,
    });
  }

  async findAnyById(assignmentId: string) {
    return prisma.vehicleAssignment.findUnique({
      where: { id: assignmentId },
      select: assignmentSelect,
    });
  }

  async findActiveVehicleById(vehicleId: string) {
    return prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        userId: true,
      },
    });
  }

  async findActiveUserById(userId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
        companyId: true,
      },
    });
  }

  async hasDriverOverlap(input: {
    driverUserId: string;
    startsAt: Date;
    endsAt?: Date | null;
    excludeAssignmentId?: string;
  }) {
    const newEnd = input.endsAt ?? null;

    const overlap = await prisma.vehicleAssignment.findFirst({
      where: {
        deletedAt: null,
        driverUserId: input.driverUserId,
        id: input.excludeAssignmentId
          ? {
              not: input.excludeAssignmentId,
            }
          : undefined,
        startsAt: {
          lt: newEnd ?? new Date("9999-12-31T23:59:59.999Z"),
        },
        OR: [
          {
            endsAt: null,
          },
          {
            endsAt: {
              gt: input.startsAt,
            },
          },
        ],
      },
      select: { id: true },
    });

    return Boolean(overlap);
  }

  async create(data: AssignmentCreateData) {
    return prisma.vehicleAssignment.create({
      data,
      select: assignmentSelect,
    });
  }

  async update(assignmentId: string, data: AssignmentUpdateData) {
    return prisma.vehicleAssignment.update({
      where: { id: assignmentId },
      data,
      select: assignmentSelect,
    });
  }

  async softDelete(assignmentId: string) {
    return prisma.vehicleAssignment.update({
      where: { id: assignmentId },
      data: {
        deletedAt: new Date(),
      },
      select: assignmentSelect,
    });
  }

  async restore(assignmentId: string) {
    return prisma.vehicleAssignment.update({
      where: { id: assignmentId },
      data: {
        deletedAt: null,
      },
      select: assignmentSelect,
    });
  }

  isConstraintConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2004");
  }
}

