import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { JobSeekerBillingService } from "./jobSeekerBilling.service.js";

const service = new JobSeekerBillingService();


export async function getMyWallet(req: Request, res: Response) {
  const data = await service.getWallet(authFromRequest(req));
  return ok(res, data);
}

export async function getMyUsage(req: Request, res: Response) {
  const data = await service.getUsage(authFromRequest(req));
  return ok(res, data);
}

export async function listCreditPacks(req: Request, res: Response) {
  const query = req.query as unknown as { activeOnly: boolean };
  const activeOnly = query.activeOnly;
  const data = await service.listCreditPacks(activeOnly);
  return ok(res, data);
}

export async function listMyTransactions(req: Request, res: Response) {
  const query = req.query as unknown as { page: number; pageSize: number };
  const data = await service.listTransactions(authFromRequest(req), {
    page: query.page,
    pageSize: query.pageSize,
  });

  return ok(res, data);
}

export async function createCreditCheckoutSession(req: Request, res: Response) {
  const data = await service.createCheckoutSession(authFromRequest(req), {
    creditPackCode: req.body.creditPackCode,
    idempotencyKey: req.body.idempotencyKey,
  });

  return created(res, data);
}

export async function getMyCheckoutSession(req: Request, res: Response) {
  const data = await service.getCheckoutSession(authFromRequest(req), getStringParam(req.params.sessionId));
  return ok(res, data);
}

export async function adminAdjustJobSeekerCredits(req: Request, res: Response) {
  const data = await service.adminAdjustCredits(authFromRequest(req), {
    targetUserId: req.body.targetUserId,
    amountCredits: req.body.amountCredits,
    reasonCode: req.body.reasonCode,
  });

  return ok(res, data);
}

