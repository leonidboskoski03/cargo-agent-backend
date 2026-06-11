import { AppError } from "../../shared/errors/AppError.js";
import { env } from "../../config/env.js";
import { BillingRepository } from "./billing.repository.js";

const repo = new BillingRepository();

export class BillingService {
  async listEvents(companyId: string | undefined, query: { page: number; pageSize: number }) {
    if (!companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    return repo.listCompanyEvents(companyId, query.page, query.pageSize);
  }

  async getReadiness() {
    const [proPlan, companyCreditPricesMissing, jobSeekerCreditPricesMissing] = await Promise.all([
      repo.findProPlanPriceReadiness(),
      repo.countCompanyCreditPacksMissingStripePrice(),
      repo.countJobSeekerCreditPacksMissingStripePrice(),
    ]);

    return {
      stripeSecretConfigured: Boolean(env.STRIPE_SECRET_KEY?.trim()),
      stripeWebhookSecretConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
      proPriceConfigured: Boolean(proPlan?.stripePriceId?.trim() || env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim()),
      companyCreditPricesConfigured: companyCreditPricesMissing === 0,
      jobSeekerCreditPricesConfigured: jobSeekerCreditPricesMissing === 0,
      bullmqEnabled: env.BULLMQ_ENABLED,
    };
  }
}

