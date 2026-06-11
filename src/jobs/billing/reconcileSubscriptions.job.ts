import { logger } from "../../config/logger.js";
import { prisma } from "../../shared/prisma/prismaClient.js";

export async function reconcileSubscriptionsJob() {
  const currentSubscriptions = await prisma.subscription.findMany({
    where: { isCurrent: true },
    select: {
      companyId: true,
      planId: true,
      status: true,
      stripeCustomerId: true,
    },
  });

  let reconciledCompanies = 0;

  for (const subscription of currentSubscriptions) {
    const stripeCustomerMismatch = subscription.stripeCustomerId
      ? { stripeCustomerId: { not: subscription.stripeCustomerId } }
      : { stripeCustomerId: { not: null } };

    const result = await prisma.company.updateMany({
      where: {
        id: subscription.companyId,
        OR: [
          { currentPlanId: { not: subscription.planId } },
          { subscriptionStatus: { not: subscription.status } },
          stripeCustomerMismatch,
        ],
      },
      data: {
        currentPlanId: subscription.planId,
        subscriptionStatus: subscription.status,
        stripeCustomerId: subscription.stripeCustomerId ?? undefined,
      },
    });

    reconciledCompanies += result.count;
  }

  const result = {
    inspectedSubscriptions: currentSubscriptions.length,
    reconciledCompanies,
  };

  logger.info(result, "Subscription reconciliation job completed");
  return result;
}

