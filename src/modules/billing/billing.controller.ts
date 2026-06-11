import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { BillingService } from "./billing.service.js";

const service = new BillingService();

export async function listMyBillingEvents(req: Request, res: Response) {
  const query = req.query as unknown as { page: number; pageSize: number };
  const data = await service.listEvents(req.auth?.companyId, {
    page: query.page,
    pageSize: query.pageSize,
  });
  return ok(res, data);
}

export async function getBillingReadiness(_req: Request, res: Response) {
  const data = await service.getReadiness();
  return ok(res, data);
}

