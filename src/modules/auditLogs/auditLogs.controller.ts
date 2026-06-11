import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { authFromRequest } from "../../shared/http/controllerAuth.helpers.js";
import { AuditLogsService } from "./auditLogs.service.js";

const service = new AuditLogsService();


export async function listAuditLogs(req: Request, res: Response) {
  const query = req.query as unknown as { action?: string; actorId?: string; page: number; pageSize: number };
  const data = await service.list(authFromRequest(req), {
    page: query.page,
    pageSize: query.pageSize,
    actorId: query.actorId,
    action: query.action,
  });

  return ok(res, data);
}

