import { JobSeekerUsageMetric, UserRole } from "@prisma/client";
import { billingConfig } from "../../config/billing.js";
import { env } from "../../config/env.js";
import { jobSeekerBillingConfig } from "../../config/jobSeekerBilling.js";
import { AppError } from "../../shared/errors/AppError.js";
import { writeAuditEvent } from "../../shared/audit/auditLogger.js";
import { getStripeClient, isStripeConfigured } from "../../shared/stripe/stripeClient.js";
import { JobSeekerBillingRepository } from "./jobSeekerBilling.repository.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

const repo = new JobSeekerBillingRepository();

function getCurrentMonthPeriodStartUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function requireJobSeeker(auth: AuthContext) {
  if (!auth.userId || auth.role !== UserRole.JOB_SEEKER) {
    throw new AppError(403, "FORBIDDEN", "Only job seekers can access this resource");
  }
}

function requireCompanyAdmin(auth: AuthContext) {
  if (!auth.userId || auth.role !== UserRole.COMPANY_ADMIN || !auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can access this resource");
  }
}

export class JobSeekerBillingService {
  async getWallet(auth: AuthContext) {
    requireJobSeeker(auth);
    const wallet = await repo.ensureWallet(auth.userId as string);

    return {
      userId: auth.userId,
      balanceCredits: wallet.balanceCredits,
      updatedAt: wallet.updatedAt,
    };
  }

  async listCreditPacks(activeOnly: boolean) {
    return repo.listCreditPacks(activeOnly);
  }

  async getUsage(auth: AuthContext) {
    requireJobSeeker(auth);

    const periodStart = getCurrentMonthPeriodStartUtc();
    const [wallet, applicationsCounter, listingsCounter] = await Promise.all([
      repo.ensureWallet(auth.userId as string),
      repo.getUsageCounter({
        userId: auth.userId as string,
        metric: JobSeekerUsageMetric.JOB_APPLICATIONS_PER_MONTH,
        periodStart,
      }),
      repo.getUsageCounter({
        userId: auth.userId as string,
        metric: JobSeekerUsageMetric.ACTIVE_LOOKING_LISTINGS,
        periodStart,
      }),
    ]);

    const applicationsUsed = applicationsCounter?.used ?? 0;
    const applicationsLimit = jobSeekerBillingConfig.freeApplicationsPerMonth;
    const listingsUsed = listingsCounter?.used ?? 0;
    const listingsLimit = jobSeekerBillingConfig.freeActiveListings;

    return {
      userId: auth.userId,
      periodStart,
      wallet: {
        balanceCredits: wallet.balanceCredits,
      },
      quotas: {
        applications: {
          used: applicationsUsed,
          limit: applicationsLimit,
          remaining: Math.max(applicationsLimit - applicationsUsed, 0),
          creditCostPerAction: jobSeekerBillingConfig.applicationCreditCost,
        },
        activeListings: {
          used: listingsUsed,
          limit: listingsLimit,
          remaining: Math.max(listingsLimit - listingsUsed, 0),
        },
      },
    };
  }

  async listTransactions(auth: AuthContext, query: { page: number; pageSize: number }) {
    requireJobSeeker(auth);

    return repo.listTransactionsByUser({
      userId: auth.userId as string,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async createCheckoutSession(auth: AuthContext, input: { creditPackCode: string; idempotencyKey?: string }) {
    requireJobSeeker(auth);

    if (!isStripeConfigured()) {
      throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe is not configured");
    }

    const normalizedIdempotencyKey = input.idempotencyKey?.trim();

    if (normalizedIdempotencyKey) {
      const existing = await repo.findCheckoutSessionByIdempotencyKey(auth.userId as string, normalizedIdempotencyKey);
      if (existing) {
        const stripe = getStripeClient();
        const existingStripeSession = await stripe.checkout.sessions.retrieve(existing.stripeCheckoutSessionId);

        return {
          checkoutSessionId: existing.id,
          stripeCheckoutSessionId: existing.stripeCheckoutSessionId,
          checkoutUrl: existingStripeSession.url,
          status: existing.status,
          amountCredits: existing.amountCredits,
          currency: existing.currency,
          reused: true,
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
        mode: "payment",
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        success_url: billingConfig.checkoutSuccessUrl,
        cancel_url: billingConfig.checkoutCancelUrl,
        metadata: {
          lane: "JOB_SEEKER_CREDITS",
          userId: auth.userId as string,
          creditPackCode: pack.code,
        },
        client_reference_id: auth.userId as string,
      },
      normalizedIdempotencyKey ? { idempotencyKey: normalizedIdempotencyKey } : undefined,
    );

    const checkout = await repo.createCheckoutSession({
      userId: auth.userId as string,
      creditPackId: pack.id,
      stripeCheckoutSessionId: stripeSession.id,
      amountCredits: pack.credits,
      amountPaid: Number(pack.priceAmount),
      currency: pack.currency,
      idempotencyKey: normalizedIdempotencyKey,
      expiresAt: stripeSession.expires_at ? new Date(stripeSession.expires_at * 1000) : null,
    });

    return {
      checkoutSessionId: checkout.id,
      stripeCheckoutSessionId: stripeSession.id,
      checkoutUrl: stripeSession.url,
      status: checkout.status,
      amountCredits: checkout.amountCredits,
      currency: checkout.currency,
      reused: false,
    };
  }

  async getCheckoutSession(auth: AuthContext, sessionId: string) {
    requireJobSeeker(auth);

    const session = await repo.findCheckoutSessionById(sessionId);
    if (!session) {
      throw new AppError(404, "CHECKOUT_SESSION_NOT_FOUND", "Checkout session not found");
    }

    if (session.userId !== auth.userId) {
      throw new AppError(403, "FORBIDDEN", "You can only access your own checkout sessions");
    }

    return session;
  }

  async adminAdjustCredits(
    auth: AuthContext,
    input: { targetUserId: string; amountCredits: number; reasonCode: string },
  ) {
    if (!env.INTERNAL_ADMIN_ADJUSTMENTS_ENABLED) {
      throw new AppError(403, "FEATURE_DISABLED", "Manual credit adjustments are disabled");
    }

    requireCompanyAdmin(auth);

    const user = await repo.findUserById(input.targetUserId);
    if (!user || user.deletedAt) {
      throw new AppError(404, "USER_NOT_FOUND", "Target user not found");
    }

    if (user.role !== UserRole.JOB_SEEKER) {
      throw new AppError(400, "INVALID_TARGET_ROLE", "Credits can only be adjusted for job seeker users");
    }

    try {
      const result = await repo.adjustCreditsByAdmin({
        targetUserId: input.targetUserId,
        amountCredits: input.amountCredits,
        reasonCode: input.reasonCode,
      });

      await writeAuditEvent({
        companyId: auth.companyId as string,
        actorUserId: auth.userId,
        action: "JOB_SEEKER_CREDIT_ADJUSTED",
        entityType: "JobSeekerWallet",
        entityId: result.wallet.id,
        payloadJson: {
          targetUserId: input.targetUserId,
          amountCredits: input.amountCredits,
          reasonCode: input.reasonCode,
          balanceAfter: result.wallet.balanceCredits,
        },
      });

      return {
        targetUserId: input.targetUserId,
        amountCredits: input.amountCredits,
        reasonCode: input.reasonCode,
        balanceAfter: result.wallet.balanceCredits,
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

