import type { BillingEventDto } from "./billing.dto.js";

export function toBillingEventDto(input: Partial<BillingEventDto>): BillingEventDto {
  return {
    id: input.id ?? "",
    eventType: input.eventType ?? "UNKNOWN",
    status: input.status ?? null,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    createdAt: input.createdAt ?? new Date(0).toISOString(),
  };
}

