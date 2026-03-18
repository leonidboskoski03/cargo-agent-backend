export type SubscriptionSummaryDto = {
  companyId: string;
  planCode: "FREE" | "PRO";
  status: "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "UNPAID";
  startsAt: string | null;
  endsAt: string | null;
  cancelAtPeriodEnd: boolean;
};

export type CheckoutSessionDto = {
  provider: "stripe";
  planCode: "FREE" | "PRO";
  checkoutSessionId: string;
  checkoutUrl: string | null;
  status: "READY";
};

