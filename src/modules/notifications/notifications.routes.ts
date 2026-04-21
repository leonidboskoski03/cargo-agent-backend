import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications.controller.js";
import {
  listNotificationsSchema,
  markAllNotificationsReadSchema,
  markNotificationReadSchema,
} from "./notifications.validator.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, validate(listNotificationsSchema), asyncRoute(listNotifications));
notificationsRouter.patch("/:notificationId/read", requireAuth, validate(markNotificationReadSchema), asyncRoute(markNotificationRead));
notificationsRouter.patch("/read-all", requireAuth, validate(markAllNotificationsReadSchema), asyncRoute(markAllNotificationsRead));
