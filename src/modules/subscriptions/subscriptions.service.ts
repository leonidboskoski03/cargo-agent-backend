import type { PlanCode } from "@prisma/client";
import { billingConfig } from "../../config/billing.js";
import { getStripeClient, isStripeConfigured } from "../../shared/stripe/stripeClient.js";
import { AppError } from "../../shared/errors/AppError.js";
import { SubscriptionsRepository } from "./subscriptions.repository.js";

const repo = new SubscriptionsRepository();

export class SubscriptionsService {
  async getCurrent(companyId?: string) {
    if (!companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const current = await repo.findCurrentByCompany(companyId);
    if (!current) {
      return null;
    }

    return {
      companyId,
      planCode: current.plan.code,
      status: current.status,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      cancelAtPeriodEnd: current.cancelAtPeriodEnd,
      currentPeriodStart: current.currentPeriodStart,
      currentPeriodEnd: current.currentPeriodEnd,
    };
  }

  async createCheckoutSession(input: { companyId?: string; planCode: PlanCode; idempotencyKey?: string }) {
    if (!input.companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    if (input.planCode === "FREE") {
      throw new AppError(400, "INVALID_PLAN_FOR_CHECKOUT", "FREE plan does not require checkout");
    }

    if (!isStripeConfigured()) {
      throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe is not configured");
    }

    const normalizedIdempotencyKey = input.idempotencyKey?.trim();

    if (normalizedIdempotencyKey) {
      const existing = await repo.findCheckoutSessionByIdempotencyKey(input.companyId, normalizedIdempotencyKey);
      if (existing) {
        const stripe = getStripeClient();
        const existingStripeSession = await stripe.checkout.sessions.retrieve(existing.stripeCheckoutSessionId);

        return {
          provider: "stripe",
          planCode: existing.planCode,
          checkoutSessionId: existing.stripeCheckoutSessionId,
          checkoutUrl: existingStripeSession.url,
          status: "REUSED",
        };
      }
    }

    const [company, targetPlan, currentSubscription] = await Promise.all([
      repo.findCompanyById(input.companyId),
      repo.findActivePlanByCode(input.planCode),
      repo.findCurrentByCompany(input.companyId),
    ]);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    if (!targetPlan) {
      throw new AppError(404, "PLAN_NOT_FOUND", "Requested plan is not available");
    }

    const stripePriceId = targetPlan.stripePriceId ?? billingConfig.proMonthlyPriceId;
    if (!stripePriceId) {
      throw new AppError(500, "PLAN_PRICE_NOT_CONFIGURED", "Stripe price ID is missing for selected plan");
    }

    const stripe = getStripeClient();
    let stripeCustomerId = company.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: company.name,
        metadata: {
          companyId: company.id,
        },
      });

      stripeCustomerId = customer.id;
      await repo.updateCompanyStripeCustomerId(company.id, customer.id);
    }

    const stripeSession = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        success_url: billingConfig.checkoutSuccessUrl,
        cancel_url: billingConfig.checkoutCancelUrl,
        client_reference_id: company.id,
        metadata: {
          companyId: company.id,
          planCode: targetPlan.code,
        },
        subscription_data: {
          metadata: {
            companyId: company.id,
            planCode: targetPlan.code,
          },
        },
      },
      normalizedIdempotencyKey ? { idempotencyKey: normalizedIdempotencyKey } : undefined,
    );

    await repo.createCheckoutSessionRecord({
      companyId: company.id,
      stripeCheckoutSessionId: stripeSession.id,
      planCode: targetPlan.code,
      expiresAt: stripeSession.expires_at ? new Date(stripeSession.expires_at * 1000) : null,
      subscriptionId: currentSubscription?.id ?? null,
      idempotencyKey: normalizedIdempotencyKey,
    });

    return {
      provider: "stripe",
      planCode: input.planCode,
      checkoutSessionId: stripeSession.id,
      checkoutUrl: stripeSession.url,
      status: "READY",
    };
  }

  async cancelAtPeriodEnd(companyId?: string) {
    if (!companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const [company, current] = await Promise.all([
      repo.findCompanyById(companyId),
      repo.findCurrentByCompany(companyId),
    ]);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    if (!current) {
      throw new AppError(404, "SUBSCRIPTION_NOT_FOUND", "No current subscription found");
    }

    let subscription = current;

    if (current.stripeSubscriptionId) {
      if (!isStripeConfigured()) {
        throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe is not configured");
      }

      const stripe = getStripeClient();
      const stripeSubscription = await stripe.subscriptions.update(current.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      const canceledAt = stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null;
      const updated = await repo.updateCurrentSubscriptionCancellation({
        companyId,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt,
      });

      if (updated) {
        subscription = {
          ...subscription,
          cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
          canceledAt: updated.canceledAt,
        };
      }
    } else {
      const updated = await repo.setSubscriptionCancelAtPeriodEnd(companyId, true);
      if (!updated) {
        throw new AppError(404, "SUBSCRIPTION_NOT_FOUND", "No current subscription found");
      }

      subscription = {
        ...subscription,
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      };
    }

    return {
      companyId,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      status: subscription.status,
    };
  }

  async createBillingPortalSession(companyId?: string) {
    if (!companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    if (!isStripeConfigured()) {
      throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe is not configured");
    }

    const company = await repo.findCompanyById(companyId);
    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    if (!company.stripeCustomerId) {
      throw new AppError(409, "STRIPE_CUSTOMER_NOT_FOUND", "Company does not have a Stripe customer yet");
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: billingConfig.portalReturnUrl,
    });

    return {
      provider: "stripe",
      url: session.url,
    };
  }

  async revertCancelAtPeriodEnd(companyId?: string) {
    if (!companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const [company, current] = await Promise.all([
      repo.findCompanyById(companyId),
      repo.findCurrentByCompany(companyId),
    ]);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    if (!current) {
      throw new AppError(404, "SUBSCRIPTION_NOT_FOUND", "No current subscription found");
    }

    let subscription = current;

    if (current.stripeSubscriptionId) {
      if (!isStripeConfigured()) {
        throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe is not configured");
      }

      const stripe = getStripeClient();
      const stripeSubscription = await stripe.subscriptions.update(current.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      const updated = await repo.updateCurrentSubscriptionCancellation({
        companyId,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: null,
      });

      if (updated) {
        subscription = {
          ...subscription,
          cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
          canceledAt: updated.canceledAt,
        };
      }
    } else {
      const updated = await repo.setSubscriptionCancelAtPeriodEnd(companyId, false);
      if (!updated) {
        throw new AppError(404, "SUBSCRIPTION_NOT_FOUND", "No current subscription found");
      }

      subscription = {
        ...subscription,
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      };
    }

    return {
      companyId,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      status: subscription.status,
    };
  }
}

