import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListScope = {
  recipientUserId?: string;
  recipientCompanyId?: string;
  unreadOnly?: boolean;
  page: number;
  pageSize: number;
};

type CreateInput = {
  type: NotificationType;
  title: string;
  body: string;
  payloadJson?: Prisma.InputJsonValue;
  recipientUserId?: string;
  recipientCompanyId?: string;
};

export class NotificationsRepository {
  async list(scope: ListScope) {
    return prisma.notification.findMany({
      where: {
        ...(scope.recipientUserId ? { recipientUserId: scope.recipientUserId } : {}),
        ...(scope.recipientCompanyId ? { recipientCompanyId: scope.recipientCompanyId } : {}),
        ...(scope.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip: (scope.page - 1) * scope.pageSize,
      take: scope.pageSize,
    });
  }

  async findById(notificationId: string) {
    return prisma.notification.findUnique({
      where: { id: notificationId },
    });
  }

  async markRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
      },
    });
  }

  async markAllRead(scope: { recipientUserId?: string; recipientCompanyId?: string }) {
    return prisma.notification.updateMany({
      where: {
        readAt: null,
        ...(scope.recipientUserId ? { recipientUserId: scope.recipientUserId } : {}),
        ...(scope.recipientCompanyId ? { recipientCompanyId: scope.recipientCompanyId } : {}),
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async create(input: CreateInput) {
    return prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        body: input.body,
        payloadJson: input.payloadJson,
        recipientUserId: input.recipientUserId,
        recipientCompanyId: input.recipientCompanyId,
      },
    });
  }
}

