import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { CompanyCreditsService } from "./companyCredits.service.js";

const service = new CompanyCreditsService();

export async function getCompanyWallet(req: Request, res: Response) {
  return ok(res, await service.getWallet(authFromRequest(req)));
}

export async function getCompanyUsage(req: Request, res: Response) {
  return ok(res, await service.getUsage(authFromRequest(req)));
}

export async function listCompanyCreditPacks(req: Request, res: Response) {
  const activeOnly = req.query.activeOnly === "true" || req.query.activeOnly === undefined;
  return ok(res, await service.listCreditPacks(activeOnly));
}

export async function listCompanyTransactions(req: Request, res: Response) {
  return ok(res, await service.listTransactions(authFromRequest(req), {
    page: Number(req.query.page ?? 1),
    pageSize: Number(req.query.pageSize ?? 20),
  }));
}

export async function createCompanyCreditCheckoutSession(req: Request, res: Response) {
  return created(res, await service.createCheckoutSession(authFromRequest(req), {
    creditPackCode: req.body.creditPackCode,
    idempotencyKey: req.body.idempotencyKey,
  }));
}

export async function getCompanyCheckoutSession(req: Request, res: Response) {
  return ok(res, await service.getCheckoutSession(authFromRequest(req), getStringParam(req.params.sessionId)));
}

export async function adminAdjustCompanyCredits(req: Request, res: Response) {
  return ok(res, await service.adminAdjustCredits(authFromRequest(req), {
    amountCredits: req.body.amountCredits,
    reasonCode: req.body.reasonCode,
  }));
}
