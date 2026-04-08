import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { NotificationsService } from "./notifications.service.js";

const service = new NotificationsService();


export async function listNotifications(req: Request, res: Response) {
  const unreadOnly = req.query.unreadOnly === "true";

  const data = await service.list(authFromRequest(req), {
    page: Number(req.query.page ?? 1),
    pageSize: Number(req.query.pageSize ?? 20),
    unreadOnly,
  });

  return ok(res, data);
}

export async function markNotificationRead(req: Request, res: Response) {
  const data = await service.markRead(authFromRequest(req), getStringParam(req.params.notificationId));
  return ok(res, data);
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  const data = await service.markAllRead(authFromRequest(req));
  return ok(res, data);
}

