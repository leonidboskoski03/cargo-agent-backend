import { UsageMetric } from "@prisma/client";
import { billingConfig } from "../../config/billing.js";
import { companyCreditsConfig } from "../../config/companyCredits.js";
import { env } from "../../config/env.js";
import { writeAuditEvent } from "../../shared/audit/auditLogger.js";
import { getCurrentMonthPeriodStartUtc } from "../../shared/billing/usageMetrics.js";
import { AppError } from "../../shared/errors/AppError.js";
import { getStripeClient, isStripeConfigured } from "../../shared/stripe/stripeClient.js";
import { requireCompanyAdmin, requireCompanyUser } from "./companyCredits.helpers.js";
import { CompanyCreditsRepository } from "./companyCredits.repository.js";
import type { AuthContext } from "./companyCredits.types.js";

const repo = new CompanyCreditsRepository();

export class CompanyCreditsService {
  async getWallet(auth: AuthContext) {
    requireCompanyUser(auth);
    const wallet = await repo.ensureWallet(auth.companyId as string);
    return { companyId: auth.companyId, balanceCredits: wallet.balanceCredits, updatedAt: wallet.updatedAt };
  }

  async getUsage(auth: AuthContext) {
    requireCompanyUser(auth);
    const companyId = auth.companyId as string;
    const periodStart = getCurrentMonthPeriodStartUtc();
    const [wallet, jobPostsCounter, vehicleListingsCounter] = await Promise.all([
      repo.ensureWallet(companyId),
      repo.getUsageCounter({ companyId, metric: UsageMetric.COMPANY_JOB_POSTS_PER_MONTH, periodStart }),
      repo.getUsageCounter({ companyId, metric: UsageMetric.COMPANY_VEHICLE_LISTINGS_PER_MONTH, periodStart }),
    ]);

    return {
      companyId,
      periodStart,
      wallet: { balanceCredits: wallet.balanceCredits },
      quotas: {
        jobPosts: {
          creditCostPerAction: companyCreditsConfig.jobPostCreditCost,
          limit: companyCreditsConfig.freeJobPostsPerMonth,
          remaining: Math.max(companyCreditsConfig.freeJobPostsPerMonth - (jobPostsCounter?.used ?? 0), 0),
          used: jobPostsCounter?.used ?? 0,
        },
        transportPosts: {
          creditCostPerAction: companyCreditsConfig.transportPostCreditCost,
        },
        vehicleListings: {
          creditCostPerAction: companyCreditsConfig.vehicleListingCreditCost,
          limit: companyCreditsConfig.freeVehicleListingsPerMonth,
          remaining: Math.max(companyCreditsConfig.freeVehicleListingsPerMonth - (vehicleListingsCounter?.used ?? 0), 0),
          used: vehicleListingsCounter?.used ?? 0,
        },
      },
    };
  }

  async listCreditPacks(activeOnly: boolean) {
    return repo.listCreditPacks(activeOnly);
  }

  async listTransactions(auth: AuthContext, query: { page: number; pageSize: number }) {
    requireCompanyUser(auth);
    return repo.listTransactionsByCompany({ companyId: auth.companyId as string, page: query.page, pageSize: query.pageSize });
  }

  async createCheckoutSession(auth: AuthContext, input: { creditPackCode: string; idempotencyKey?: string }) {
    requireCompanyAdmin(auth);

    if (!isStripeConfigured()) {
      throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe is not configured");
    }

    const companyId = auth.companyId as string;
    const normalizedIdempotencyKey = input.idempotencyKey?.trim();
    if (normalizedIdempotencyKey) {
      const existing = await repo.findCheckoutSessionByIdempotencyKey(companyId, normalizedIdempotencyKey);
      if (existing) {
        const stripe = getStripeClient();
        const existingStripeSession = await stripe.checkout.sessions.retrieve(existing.stripeCheckoutSessionId);
        return {
          amountCredits: existing.amountCredits,
          checkoutSessionId: existing.id,
          checkoutUrl: existingStripeSession.url,
          currency: existing.currency,
          reused: true,
          status: existing.status,
          stripeCheckoutSessionId: existing.stripeCheckoutSessionId,
        };
      }
    }

    const pack = await repo.findActiveCreditPackByCode(input.creditPackCode.trim().toUpperCase());
    if (!pack) {
      throw new AppError(404, "CREDIT_PACK_NOT_FOUND", "Credit pack not found or inactive");
    }

    if (!pack.stripePriceId) {
      throw new AppError(500, "CREDIT_PACK_PRICE_NOT_CONFIGURED", "Stripe price is not configured for this credit pack");
    }

    const stripe = getStripeClient();
    const stripeSession = await stripe.checkout.sessions.create(
      {
        client_reference_id: companyId,
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        metadata: { companyId, creditPackCode: pack.code, lane: "COMPANY_CREDITS" },
        mode: "payment",
        success_url: billingConfig.companyCreditsSuccessUrl,
        cancel_url: billingConfig.companyCreditsCancelUrl,
      },
      normalizedIdempotencyKey ? { idempotencyKey: normalizedIdempotencyKey } : undefined,
    );

    const checkout = await repo.createCheckoutSession({
      amountCredits: pack.credits,
      amountPaid: Number(pack.priceAmount),
      companyId,
      creditPackId: pack.id,
      currency: pack.currency,
      expiresAt: stripeSession.expires_at ? new Date(stripeSession.expires_at * 1000) : null,
      idempotencyKey: normalizedIdempotencyKey,
      stripeCheckoutSessionId: stripeSession.id,
    });

    return {
      amountCredits: checkout.amountCredits,
      checkoutSessionId: checkout.id,
      checkoutUrl: stripeSession.url,
      currency: checkout.currency,
      reused: false,
      status: checkout.status,
      stripeCheckoutSessionId: stripeSession.id,
    };
  }

  async getCheckoutSession(auth: AuthContext, sessionId: string) {
    requireCompanyUser(auth);
    const session = await repo.findCheckoutSessionById(sessionId) ?? await repo.findCheckoutSessionByStripeId(sessionId);
    if (!session) {
      throw new AppError(404, "CHECKOUT_SESSION_NOT_FOUND", "Checkout session not found");
    }
    if (session.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only access your company checkout sessions");
    }
    return session;
  }

  async adminAdjustCredits(auth: AuthContext, input: { amountCredits: number; reasonCode: string }) {
    if (!env.INTERNAL_ADMIN_ADJUSTMENTS_ENABLED) {
      throw new AppError(403, "FEATURE_DISABLED", "Manual credit adjustments are disabled");
    }

    requireCompanyAdmin(auth);

    try {
      const result = await repo.adjustCreditsByAdmin({
        amountCredits: input.amountCredits,
        companyId: auth.companyId as string,
        reasonCode: input.reasonCode,
      });

      await writeAuditEvent({
        action: "COMPANY_CREDIT_ADJUSTED",
        actorUserId: auth.userId,
        companyId: auth.companyId as string,
        entityId: result.wallet.id,
        entityType: "CompanyCreditWallet",
        payloadJson: { amountCredits: input.amountCredits, balanceAfter: result.wallet.balanceCredits, reasonCode: input.reasonCode },
      });

      return {
        amountCredits: input.amountCredits,
        balanceAfter: result.wallet.balanceCredits,
        companyId: auth.companyId,
        reasonCode: input.reasonCode,
        transactionId: result.transaction.id,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE_FOR_ADJUSTMENT") {
        throw new AppError(409, "INSUFFICIENT_BALANCE", "Cannot reduce credits below zero");
      }
      throw error;
    }
  }
}
