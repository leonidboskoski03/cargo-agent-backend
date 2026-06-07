import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { NotificationsService } from "./notifications.service.js";

const service = new NotificationsService();


export async function listNotifications(req: Request, res: Response) {
  const query = req.query as unknown as { page: number; pageSize: number; unreadOnly?: boolean };
  const unreadOnly = query.unreadOnly;

  const data = await service.list(authFromRequest(req), {
    page: query.page,
    pageSize: query.pageSize,
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

