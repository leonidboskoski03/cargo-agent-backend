export type PlanCode = "FREE" | "PRO";

export type PlanFeatureKey =
  | "PROMOTED_POSTS"
  | "ANALYTICS"
  | "ROUTE_ALERTS"
  | "PRIORITY_PLACEMENT"
  | "CSV_EXPORT";

const PLAN_FEATURES: Record<PlanCode, Record<PlanFeatureKey, boolean>> = {
  FREE: {
    PROMOTED_POSTS: false,
    ANALYTICS: false,
    ROUTE_ALERTS: false,
    PRIORITY_PLACEMENT: false,
    CSV_EXPORT: false,
  },
  PRO: {
    PROMOTED_POSTS: true,
    ANALYTICS: true,
    ROUTE_ALERTS: true,
    PRIORITY_PLACEMENT: true,
    CSV_EXPORT: true,
  },
};

export function hasPlanFeature(planCode: PlanCode, feature: PlanFeatureKey): boolean {
  return PLAN_FEATURES[planCode][feature];
}

