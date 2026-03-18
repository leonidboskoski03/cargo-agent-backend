import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { UsageService } from "../billing/usage.service.js";
import type { UsageMetric } from "../billing/usageMetrics.js";

const usageService = new UsageService();

export function enforceUsageLimit(metric: UsageMetric) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const companyId = req.auth?.companyId;

    if (!companyId) {
      return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
    }

    const result = await usageService.assertCanUse(companyId, metric);
    if (!result.allowed) {
      return next(new AppError(403, "USAGE_LIMIT_REACHED", "Plan usage limit reached"));
    }

    return next();
  };
}

