import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications.controller.js";
import {
  listNotificationsSchema,
  markAllNotificationsReadSchema,
  markNotificationReadSchema,
} from "./notifications.validator.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, validate(listNotificationsSchema), listNotifications);
notificationsRouter.patch("/:notificationId/read", requireAuth, validate(markNotificationReadSchema), markNotificationRead);
notificationsRouter.patch("/read-all", requireAuth, validate(markAllNotificationsReadSchema), markAllNotificationsRead);
