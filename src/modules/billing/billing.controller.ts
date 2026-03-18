import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { BillingService } from "./billing.service.js";

const service = new BillingService();

export async function listMyBillingEvents(req: Request, res: Response) {
  const data = await service.listEvents(req.auth?.companyId);
  return ok(res, data);
}

