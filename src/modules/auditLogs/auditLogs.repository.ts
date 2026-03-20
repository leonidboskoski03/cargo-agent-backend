import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListFilters = {
  companyId: string;
  page: number;
  pageSize: number;
  actorUserId?: string;
  action?: string;
};

type CreateInput = {
  companyId: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payloadJson?: unknown;
};

export class AuditLogsRepository {
  async list(filters: ListFilters) {
    return prisma.auditLog.findMany({
      where: {
        companyId: filters.companyId,
        ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
        ...(filters.action ? { action: filters.action } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });
  }

  async create(input: CreateInput) {
    return prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payloadJson: input.payloadJson as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

