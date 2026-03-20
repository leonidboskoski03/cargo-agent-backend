import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { PlansService } from "./plans.service.js";

const service = new PlansService();

export async function listPlans(req: Request, res: Response) {
  const activeOnly = req.query.activeOnly === "true" || req.query.activeOnly === undefined;
  const data = await service.listPublicPlans(activeOnly);
  return ok(res, data);
}

