import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { BillingService } from "./billing.service.js";

const service = new BillingService();

export async function listMyBillingEvents(req: Request, res: Response) {
  const data = await service.listEvents(req.auth?.companyId, {
    page: Number(req.query.page ?? 1),
    pageSize: Number(req.query.pageSize ?? 20),
  });
  return ok(res, data);
}

export async function getBillingReadiness(_req: Request, res: Response) {
  const data = await service.getReadiness();
  return ok(res, data);
}

