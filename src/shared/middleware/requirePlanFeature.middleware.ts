import type { NextFunction, Request, Response } from "express";
import { EntitlementsService } from "../billing/entitlements.service.js";
import { AppError } from "../errors/AppError.js";
import type { PlanFeatureKey } from "../billing/entitlements.js";

const entitlementsService = new EntitlementsService();

export function requirePlanFeature(feature: PlanFeatureKey) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const companyId = req.auth?.companyId;

    if (!companyId) {
      return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
    }

    const result = await entitlementsService.hasFeature(companyId, feature);

    if (!result.allowed) {
      return next(
        new AppError(403, "PLAN_FEATURE_REQUIRED", "Your plan does not include this feature", {
          feature,
          planCode: result.entitlements.planCode,
          companyId,
        }),
      );
    }

    return next();
  };
}

