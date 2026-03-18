import type { SubscriptionSummaryDto } from "./subscriptions.dto.js";

export function toSubscriptionSummary(input: Partial<SubscriptionSummaryDto>): SubscriptionSummaryDto {
  return {
    companyId: input.companyId ?? "",
    planCode: input.planCode ?? "FREE",
    status: input.status ?? "FREE",
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
  };
}

