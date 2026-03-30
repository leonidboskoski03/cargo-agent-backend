import { type PlanCode } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

export class SubscriptionsRepository {
  async findCurrentByCompany(companyId: string) {
    return prisma.subscription.findFirst({
      where: { companyId, isCurrent: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
    idempotencyKey?: string;
  }) {
    return prisma.checkoutSession.create({
      data: {
        companyId: input.companyId,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        planCode: input.planCode,
        expiresAt: input.expiresAt ?? null,
        subscriptionId: input.subscriptionId ?? null,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }

  async findCheckoutSessionByIdempotencyKey(companyId: string, idempotencyKey: string) {
    return prisma.checkoutSession.findFirst({
      where: {
        companyId,
        idempotencyKey,
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async setSubscriptionCancelAtPeriodEnd(companyId: string, value: boolean) {
    const current = await prisma.subscription.findFirst({
      where: { companyId, isCurrent: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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

  async updateCurrentSubscriptionCancellation(input: {
    companyId: string;
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date | null;
  }) {
    const current = await prisma.subscription.findFirst({
      where: { companyId: input.companyId, isCurrent: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    if (!current) {
      return null;
    }

    return prisma.subscription.update({
      where: { id: current.id },
      data: {
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        canceledAt: input.canceledAt ?? null,
        version: { increment: 1 },
      },
    });
  }
}

