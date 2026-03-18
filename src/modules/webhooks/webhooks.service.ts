import type { BillingEventStatus, BillingEventType, PlanCode, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";
import { logger } from "../../config/logger.js";
import { isSupportedStripeLifecycleEvent } from "../../shared/stripe/stripeEventMapper.js";
import { WebhooksRepository } from "./webhooks.repository.js";

const repo = new WebhooksRepository();

function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
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

function toBillingEventType(type: Stripe.Event.Type): BillingEventType | null {
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

function toBillingEventStatus(type: Stripe.Event.Type): BillingEventStatus {
  if (type === "invoice.payment_failed") {
    return "FAILED";
  }

  return "SUCCEEDED";
}

function toDate(unixSeconds: number | null | undefined) {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000);
}

function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as unknown as { payment_intent?: string | { id?: string } | null };
  const value = raw.payment_intent;
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id ?? null;
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };

  return {
    start: toDate(raw.current_period_start),
    end: toDate(raw.current_period_end),
  };
}

export class WebhooksService {
  async handleStripeEvent(input: { event: Stripe.Event; payload: string }) {
    const eventType = input.event.type;
    if (!isSupportedStripeLifecycleEvent(eventType)) {
      logger.debug({ eventId: input.event.id, eventType }, "Ignoring unsupported Stripe event");
      return { received: true, ignored: true };
    }

    const mappedType = toBillingEventType(eventType);
    if (!mappedType) {
      return { received: true, ignored: true };
    }

    if (eventType === "checkout.session.completed") {
      await this.handleCheckoutCompleted(input.event, mappedType, input.payload);
      return { received: true, ignored: false };
    }

    if (eventType === "invoice.paid" || eventType === "invoice.payment_failed") {
      await this.handleInvoiceEvent(input.event, mappedType, input.payload);
      return { received: true, ignored: false };
    }

    await this.handleSubscriptionLifecycle(input.event, mappedType, input.payload);
    return { received: true, ignored: false };
  }

  private async handleCheckoutCompleted(event: Stripe.Event, eventType: BillingEventType, payload: string) {
    const session = event.data.object as Stripe.Checkout.Session;
    const companyId = session.client_reference_id ?? session.metadata?.companyId;
    if (!companyId || !session.id) {
      logger.warn({ eventId: event.id }, "Skipping checkout event without company/session identifiers");
      return;
    }

    const persisted = await repo.persistBillingEvent({
      companyId,
      providerEventId: event.id,
      eventType,
      status: toBillingEventStatus(event.type),
      payload: JSON.parse(payload),
    });

    if (!persisted.inserted) {
      return;
    }

    await repo.markCheckoutCompleted(session.id);
  }

  private async handleInvoiceEvent(event: Stripe.Event, eventType: BillingEventType, payload: string) {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!stripeCustomerId) {
      logger.warn({ eventId: event.id }, "Skipping invoice event without Stripe customer id");
      return;
    }

    const company = await repo.getCompanyByStripeCustomerId(stripeCustomerId);
    if (!company) {
      logger.warn({ eventId: event.id, stripeCustomerId }, "Skipping invoice event for unknown Stripe customer");
      return;
    }

    const current = await repo.getCurrentSubscriptionByCompanyId(company.id);
    await repo.persistBillingEvent({
      companyId: company.id,
      subscriptionId: current?.id,
      providerEventId: event.id,
      eventType,
      status: toBillingEventStatus(event.type),
      payload: JSON.parse(payload),
      amount: invoice.amount_paid ? invoice.amount_paid / 100 : null,
      currency: invoice.currency?.toUpperCase() ?? null,
      stripeInvoiceId: invoice.id ?? null,
      stripePaymentIntentId: getInvoicePaymentIntentId(invoice),
    });
  }

  private async handleSubscriptionLifecycle(event: Stripe.Event, eventType: BillingEventType, payload: string) {
    const stripeSubscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId =
      typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer?.id;

    if (!stripeCustomerId) {
      logger.warn({ eventId: event.id }, "Skipping subscription event without Stripe customer id");
      return;
    }

    const companyIdFromMetadata = stripeSubscription.metadata?.companyId;
    const company = companyIdFromMetadata
      ? await repo.getCompanyById(companyIdFromMetadata)
      : await repo.getCompanyByStripeCustomerId(stripeCustomerId);

    if (!company) {
      logger.warn({ eventId: event.id, stripeCustomerId }, "Skipping subscription event for unknown company");
      return;
    }

    if (event.type === "customer.subscription.deleted") {
      const freePlan = await repo.getPlanByCode("FREE");
      if (!freePlan) {
        logger.error({ eventId: event.id }, "FREE plan is missing; cannot downgrade canceled subscription");
        return;
      }

      const freeSubscription = await repo.downgradeCompanyToFree({
        companyId: company.id,
        freePlanId: freePlan.id,
        stripeCustomerId,
      });

      await repo.persistBillingEvent({
        companyId: company.id,
        subscriptionId: freeSubscription.id,
        providerEventId: event.id,
        eventType,
        status: toBillingEventStatus(event.type),
        payload: JSON.parse(payload),
      });

      return;
    }

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    let planCode: PlanCode = "PRO";
    if (priceId) {
      const mappedPlan = await repo.getPlanByStripePriceId(priceId);
      if (mappedPlan) {
        planCode = mappedPlan.code;
      }
    }

    const plan = await repo.getPlanByCode(planCode);
    if (!plan) {
      logger.error({ eventId: event.id, planCode }, "Plan not found while processing subscription event");
      return;
    }

    const period = getSubscriptionPeriod(stripeSubscription);

    const current = await repo.upsertCurrentSubscription({
      companyId: company.id,
      planId: plan.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId,
      status: toSubscriptionStatus(stripeSubscription.status),
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      startsAt: toDate(stripeSubscription.start_date),
      trialEndsAt: toDate(stripeSubscription.trial_end),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: toDate(stripeSubscription.canceled_at),
    });

    await repo.persistBillingEvent({
      companyId: company.id,
      subscriptionId: current.id,
      providerEventId: event.id,
      eventType,
      status: toBillingEventStatus(event.type),
      payload: JSON.parse(payload),
    });
  }
}

