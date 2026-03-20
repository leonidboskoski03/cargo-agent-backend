import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { JobSeekerBillingService } from "./jobSeekerBilling.service.js";

const service = new JobSeekerBillingService();

function authFromRequest(req: Request) {
  return req.auth ? { userId: req.auth.sub, role: req.auth.role, companyId: req.auth.companyId } : {};
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function getMyWallet(req: Request, res: Response) {
  const data = await service.getWallet(authFromRequest(req));
  return ok(res, data);
}

export async function getMyUsage(req: Request, res: Response) {
  const data = await service.getUsage(authFromRequest(req));
  return ok(res, data);
}

export async function listCreditPacks(req: Request, res: Response) {
  const activeOnly = req.query.activeOnly === "true" || req.query.activeOnly === undefined;
  const data = await service.listCreditPacks(activeOnly);
  return ok(res, data);
}

export async function listMyTransactions(req: Request, res: Response) {
  const data = await service.listTransactions(authFromRequest(req), {
    page: Number(req.query.page ?? 1),
    pageSize: Number(req.query.pageSize ?? 20),
  });

  return ok(res, data);
}

export async function createCreditCheckoutSession(req: Request, res: Response) {
  const data = await service.createCheckoutSession(authFromRequest(req), {
    creditPackCode: req.body.creditPackCode,
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

