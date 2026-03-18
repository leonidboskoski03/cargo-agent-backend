import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { AuditLogsService } from "./auditLogs.service.js";

const service = new AuditLogsService();

export async function listAuditLogs(req: Request, res: Response) {
  const data = await service.list(req.query);
  return ok(res, data);
}

