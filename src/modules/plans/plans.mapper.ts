import type { PlanSummaryDto } from "./plans.dto.js";

export function toPlanSummary(input: Partial<PlanSummaryDto>): PlanSummaryDto {
  return {
    code: input.code ?? "FREE",
    name: input.name ?? "Free",
    billingInterval: input.billingInterval ?? null,
    priceAmount: input.priceAmount ?? "0",
    currency: input.currency ?? null,
    features: {
      promotedPosts: input.features?.promotedPosts ?? false,
      analytics: input.features?.analytics ?? false,
      routeAlerts: input.features?.routeAlerts ?? false,
    },
  };
}

