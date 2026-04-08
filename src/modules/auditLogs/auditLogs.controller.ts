import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { authFromRequest } from "../../shared/http/controllerAuth.helpers.js";
import { AuditLogsService } from "./auditLogs.service.js";

const service = new AuditLogsService();


export async function listAuditLogs(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    page: Number(req.query.page ?? 1),
    pageSize: Number(req.query.pageSize ?? 20),
    actorId: typeof req.query.actorId === "string" ? req.query.actorId : undefined,
    action: typeof req.query.action === "string" ? req.query.action : undefined,
  });

  return ok(res, data);
}

