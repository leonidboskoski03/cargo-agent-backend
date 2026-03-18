import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { NotificationsService } from "./notifications.service.js";

const service = new NotificationsService();

export async function listNotifications(req: Request, res: Response) {
  const data = await service.list(req.query);
  return ok(res, data);
}

