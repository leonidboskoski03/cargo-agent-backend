import { type PlanCode } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

export class SubscriptionsRepository {
  async findCurrentByCompany(companyId: string) {
    return prisma.subscription.findUnique({
      where: { companyId_isCurrent: { companyId, isCurrent: true } },
      include: { plan: true },
    });
  }

  async findCompanyById(companyId: string) {
    return prisma.company.findUnique({ where: { id: companyId } });
  }

  async updateCompanyStripeCustomerId(companyId: string, stripeCustomerId: string) {
    return prisma.company.update({
      where: { id: companyId },
      data: { stripeCustomerId },
    });
  }

  async findActivePlanByCode(code: PlanCode) {
    return prisma.plan.findFirst({ where: { code, isActive: true } });
  }

  async createCheckoutSessionRecord(input: {
    companyId: string;
    stripeCheckoutSessionId: string;
    planCode: PlanCode;
    expiresAt?: Date | null;
    subscriptionId?: string | null;
  }) {
    return prisma.checkoutSession.create({
      data: {
        companyId: input.companyId,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        planCode: input.planCode,
        expiresAt: input.expiresAt ?? null,
        subscriptionId: input.subscriptionId ?? null,
      },
    });
  }

  async setSubscriptionCancelAtPeriodEnd(companyId: string, value: boolean) {
    const current = await prisma.subscription.findUnique({
      where: { companyId_isCurrent: { companyId, isCurrent: true } },
    });

    if (!current) {
      return null;
    }

    return prisma.subscription.update({
      where: { id: current.id },
      data: {
        cancelAtPeriodEnd: value,
        version: { increment: 1 },
      },
    });
  }
}

