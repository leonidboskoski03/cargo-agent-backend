import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { PlansService } from "./plans.service.js";

const service = new PlansService();

export async function listPlans(req: Request, res: Response) {
  const query = req.query as unknown as { activeOnly: boolean };
  const activeOnly = query.activeOnly;
  const data = await service.listPublicPlans(activeOnly);
  return ok(res, data);
}

