export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS";

import { NotificationType, type Prisma, type UserRole } from "@prisma/client";
import { z } from "zod";
import { listNotificationsSchema } from "./notifications.validator.js";

export type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

export type ListQuery = z.infer<typeof listNotificationsSchema>["query"];

export type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  payloadJson?: Prisma.InputJsonValue;
  recipientUserId?: string;
  recipientCompanyId?: string;
};

