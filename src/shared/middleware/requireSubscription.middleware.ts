import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING", "FREE"]);

export function requireActiveSubscription(req: Request, _res: Response, next: NextFunction) {
  const status = req.header("x-company-subscription-status") ?? "FREE";

  if (!ACTIVE_STATUSES.has(status)) {
    return next(new AppError(402, "SUBSCRIPTION_REQUIRED", "Active subscription is required"));
  }

  return next();
}

