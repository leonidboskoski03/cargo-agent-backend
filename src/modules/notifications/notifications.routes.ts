import { Router } from "express";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listNotifications } from "./notifications.controller.js";
import { listNotificationsSchema } from "./notifications.validator.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", validate(listNotificationsSchema), listNotifications);
