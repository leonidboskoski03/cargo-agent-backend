import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { authFromRequest } from "../../shared/http/controllerAuth.helpers.js";
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
    idempotencyKey: req.body.idempotencyKey,
  });

  return ok(res, data);
}

export async function cancelSubscriptionAtPeriodEnd(req: Request, res: Response) {
  const auth = authFromRequest(req);
  const data = await service.cancelAtPeriodEnd({
    actorUserId: auth.userId,
    companyId: auth.companyId,
    reason: req.body.reason,
  });
  return ok(res, data);
}

export async function createBillingPortalSession(req: Request, res: Response) {
  const data = await service.createBillingPortalSession(req.auth?.companyId);
  return ok(res, data);
}

export async function revertSubscriptionCancelAtPeriodEnd(req: Request, res: Response) {
  const data = await service.revertCancelAtPeriodEnd(req.auth?.companyId);
  return ok(res, data);
}

