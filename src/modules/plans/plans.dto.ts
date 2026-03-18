export type PlanSummaryDto = {
  code: "FREE" | "PRO";
  name: string;
  billingInterval: "MONTHLY" | "YEARLY" | null;
  priceAmount: string;
  currency: string | null;
  features: {
    promotedPosts: boolean;
    analytics: boolean;
    routeAlerts: boolean;
  };
};

