import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { PlansService } from "./plans.service.js";

const service = new PlansService();

export async function listPlans(_req: Request, res: Response) {
  const data = await service.listPublicPlans();
  return ok(res, data);
}

