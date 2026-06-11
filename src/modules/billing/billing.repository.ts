import { prisma } from "../../shared/prisma/prismaClient.js";

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
    return prisma.companyCreditPack.count({
      where: {
        isActive: true,
        OR: [{ stripePriceId: null }, { stripePriceId: "" }],
      },
    });
  }

  async countJobSeekerCreditPacksMissingStripePrice() {
    return prisma.jobSeekerCreditPack.count({
      where: {
        isActive: true,
        OR: [{ stripePriceId: null }, { stripePriceId: "" }],
      },
    });
  }
}

