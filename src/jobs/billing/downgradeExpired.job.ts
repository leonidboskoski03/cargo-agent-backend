import { logger } from "../../config/logger.js";
import { WebhooksRepository } from "../../modules/webhooks/webhooks.repository.js";
import { prisma } from "../../shared/prisma/prismaClient.js";

const repo = new WebhooksRepository();

export async function downgradeExpiredSubscriptionsJob(now = new Date()) {
  const freePlan = await prisma.plan.findUnique({ where: { code: "FREE" }, select: { id: true } });

  if (!freePlan) {
    logger.warn("Expired subscription downgrade skipped because FREE plan is missing");
    return { downgradedCompanies: 0, skippedReason: "FREE_PLAN_MISSING" as const };
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      isCurrent: true,
      status: { in: ["CANCELED", "UNPAID"] },
      OR: [
        { endsAt: { lte: now } },
        { currentPeriodEnd: { lte: now } },
      ],
    },
    select: {
      companyId: true,
      stripeCustomerId: true,
    },
  });

  let downgradedCompanies = 0;

  for (const subscription of subscriptions) {
    await repo.downgradeCompanyToFree({
      companyId: subscription.companyId,
      freePlanId: freePlan.id,
      stripeCustomerId: subscription.stripeCustomerId,
    });
    downgradedCompanies += 1;
  }

  const result = { downgradedCompanies };

  logger.info(result, "Expired subscription downgrade job completed");
  return result;
}

