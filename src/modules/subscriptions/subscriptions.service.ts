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

  async createCheckoutSession(input: { companyId?: string; planCode: PlanCode }) {
    if (!input.companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    if (input.planCode === "FREE") {
      throw new AppError(400, "INVALID_PLAN_FOR_CHECKOUT", "FREE plan does not require checkout");
    }

    if (!isStripeConfigured()) {
      throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe is not configured");
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

    const stripeSession = await stripe.checkout.sessions.create({
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
    });

    await repo.createCheckoutSessionRecord({
      companyId: company.id,
      stripeCheckoutSessionId: stripeSession.id,
      planCode: targetPlan.code,
      expiresAt: stripeSession.expires_at ? new Date(stripeSession.expires_at * 1000) : null,
      subscriptionId: currentSubscription?.id ?? null,
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

    const subscription = await repo.setSubscriptionCancelAtPeriodEnd(companyId, true);
    if (!subscription) {
      throw new AppError(404, "SUBSCRIPTION_NOT_FOUND", "No current subscription found");
    }

    return {
      companyId,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      status: subscription.status,
    };
  }
}

