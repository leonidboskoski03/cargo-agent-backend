import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { hasPlanFeature, type PlanFeatureKey } from "../billing/entitlements.js";

export function requirePlanFeature(feature: PlanFeatureKey) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const planCode = (req.header("x-company-plan") ?? "FREE") as "FREE" | "PRO";

    if (!hasPlanFeature(planCode, feature)) {
      return next(new AppError(403, "PLAN_FEATURE_REQUIRED", "Your plan does not include this feature"));
    }

    return next();
  };
}

