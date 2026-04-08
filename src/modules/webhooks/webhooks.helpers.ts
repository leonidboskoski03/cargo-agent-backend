import type { BillingEventStatus, BillingEventType, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

export function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "unpaid":
      return "UNPAID";
    default:
      return "INCOMPLETE";
  }
}

export function toBillingEventType(type: Stripe.Event.Type): BillingEventType | null {
  switch (type) {
    case "checkout.session.completed":
      return "CHECKOUT_COMPLETED";
    case "invoice.paid":
      return "INVOICE_PAID";
    case "invoice.payment_failed":
      return "INVOICE_PAYMENT_FAILED";
    case "customer.subscription.created":
      return "SUBSCRIPTION_CREATED";
    case "customer.subscription.updated":
      return "SUBSCRIPTION_UPDATED";
    case "customer.subscription.deleted":
      return "SUBSCRIPTION_CANCELED";
    default:
      return null;
  }
}

export function toBillingEventStatus(type: Stripe.Event.Type): BillingEventStatus {
  if (type === "invoice.payment_failed") {
    return "FAILED";
  }

  return "SUCCEEDED";
}

export function toDate(unixSeconds: number | null | undefined) {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000);
}

export function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as unknown as { payment_intent?: string | { id?: string } | null };
  const value = raw.payment_intent;
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id ?? null;
}

export function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };

  return {
    start: toDate(raw.current_period_start),
    end: toDate(raw.current_period_end),
  };
}

