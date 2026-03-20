import { NotificationType, type Prisma, type UserRole } from "@prisma/client";
import { z } from "zod";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  listNotificationsSchema,
} from "./notifications.validator.js";
import { NotificationsRepository } from "./notifications.repository.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

type ListQuery = z.infer<typeof listNotificationsSchema>["query"];

type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  payloadJson?: Prisma.InputJsonValue;
  recipientUserId?: string;
  recipientCompanyId?: string;
};

function requireAuth(auth: AuthContext) {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export class NotificationsService {
  private readonly repository = new NotificationsRepository();

  async list(auth: AuthContext, query: ListQuery) {
    requireAuth(auth);

    if (auth.role === Roles.JOB_SEEKER) {
      return this.repository.list({
        recipientUserId: auth.userId,
        unreadOnly: query.unreadOnly,
        page: query.page,
        pageSize: query.pageSize,
      });
    }

    if ((auth.role === Roles.COMPANY_ADMIN || auth.role === Roles.COMPANY_DRIVER) && auth.companyId) {
      return this.repository.list({
        recipientCompanyId: auth.companyId,
        unreadOnly: query.unreadOnly,
        page: query.page,
        pageSize: query.pageSize,
      });
    }

    throw new AppError(403, "FORBIDDEN", "You do not have permission to list notifications");
  }

  async markRead(auth: AuthContext, notificationId: string) {
    requireAuth(auth);

    const notification = await this.repository.findById(notificationId);
    if (!notification) {
      throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
    }

    if (auth.role === Roles.JOB_SEEKER) {
      if (notification.recipientUserId !== auth.userId) {
        throw new AppError(403, "FORBIDDEN", "You can only update your own notifications");
      }
    } else if (auth.role === Roles.COMPANY_ADMIN || auth.role === Roles.COMPANY_DRIVER) {
      if (!auth.companyId || notification.recipientCompanyId !== auth.companyId) {
        throw new AppError(403, "FORBIDDEN", "You can only update company notifications in your scope");
      }
    } else {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to update notifications");
    }

    return this.repository.markRead(notificationId);
  }

  async markAllRead(auth: AuthContext) {
    requireAuth(auth);

    if (auth.role === Roles.JOB_SEEKER) {
      return this.repository.markAllRead({ recipientUserId: auth.userId });
    }

    if ((auth.role === Roles.COMPANY_ADMIN || auth.role === Roles.COMPANY_DRIVER) && auth.companyId) {
      return this.repository.markAllRead({ recipientCompanyId: auth.companyId });
    }

    throw new AppError(403, "FORBIDDEN", "You do not have permission to update notifications");
  }

  async create(input: CreateNotificationInput) {
    return this.repository.create(input);
  }
}

