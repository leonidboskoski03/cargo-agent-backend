import { prisma } from "../../shared/prisma/prismaClient.js";

function isStripePriceId(value: string | null | undefined) {
  return Boolean(value?.trim().startsWith("price_"));
}

export class BillingRepository {
  async listCompanyEvents(companyId: string, page: number, pageSize: number) {
    return prisma.billingEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findProPlanPriceReadiness() {
    return prisma.plan.findUnique({
      where: { code: "PRO" },
      select: { stripePriceId: true },
    });
  }

  async countCompanyCreditPacksMissingStripePrice() {
    const packs = await prisma.companyCreditPack.findMany({
      where: {
        isActive: true,
      },
      select: { stripePriceId: true },
    });
    return packs.filter((pack) => !isStripePriceId(pack.stripePriceId)).length;
  }

  async countJobSeekerCreditPacksMissingStripePrice() {
    const packs = await prisma.jobSeekerCreditPack.findMany({
      where: {
        isActive: true,
      },
      select: { stripePriceId: true },
    });
    return packs.filter((pack) => !isStripePriceId(pack.stripePriceId)).length;
  }
}

