import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { SubscriptionsService } from "./subscriptions.service.js";

const service = new SubscriptionsService();

export async function getMySubscription(req: Request, res: Response) {
  const data = await service.getCurrent(req.auth?.companyId);
  return ok(res, data);
}

export async function createSubscriptionCheckoutSession(req: Request, res: Response) {
  const data = await service.createCheckoutSession({
    companyId: req.auth?.companyId,
    planCode: req.body.planCode,
  });

  return ok(res, data);
}

export async function cancelSubscriptionAtPeriodEnd(req: Request, res: Response) {
  const data = await service.cancelAtPeriodEnd(req.auth?.companyId);
  return ok(res, data);
}

