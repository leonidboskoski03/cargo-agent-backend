import {
  Prisma,
  type BillingEventStatus,
  type BillingEventType,
  type PlanCode,
  type SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type PersistBillingEventInput = {
  companyId: string;
  subscriptionId?: string | null;
  providerEventId: string;
  eventType: BillingEventType;
  status?: BillingEventStatus;
  payload: Prisma.InputJsonValue;
  amount?: Prisma.Decimal | number | null;
  currency?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
};

type UpsertSubscriptionInput = {
  companyId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId?: string | null;
  status: SubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  startsAt?: Date | null;
  trialEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
};

export class WebhooksRepository {
  async getCompanyByStripeCustomerId(stripeCustomerId: string) {
    return prisma.company.findUnique({ where: { stripeCustomerId } });
  }

  async getCompanyById(companyId: string) {
    return prisma.company.findUnique({ where: { id: companyId } });
  }

  async getPlanByCode(code: PlanCode) {
    return prisma.plan.findUnique({ where: { code } });
  }

  async getPlanByStripePriceId(stripePriceId: string) {
    return prisma.plan.findUnique({ where: { stripePriceId } });
  }

  async getCurrentSubscriptionByCompanyId(companyId: string) {
    return prisma.subscription.findUnique({ where: { companyId_isCurrent: { companyId, isCurrent: true } } });
  }

  async markCheckoutCompleted(stripeCheckoutSessionId: string) {
    return prisma.checkoutSession.updateMany({
      where: { stripeCheckoutSessionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  async persistBillingEvent(input: PersistBillingEventInput) {
    try {
      const event = await prisma.billingEvent.create({
        data: {
          companyId: input.companyId,
          subscriptionId: input.subscriptionId ?? null,
          providerEventId: input.providerEventId,
          eventType: input.eventType,
          provider: "STRIPE",
          status: input.status,
          payloadJson: input.payload,
          amount: input.amount ?? null,
          currency: input.currency ?? null,
          stripeInvoiceId: input.stripeInvoiceId ?? null,
          stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        },
      });

      return { inserted: true, event };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { inserted: false, event: null };
      }

      throw error;
    }
  }

  async upsertCurrentSubscription(input: UpsertSubscriptionInput) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.subscription.findUnique({
        where: { companyId_isCurrent: { companyId: input.companyId, isCurrent: true } },
      });

      if (current && current.stripeSubscriptionId !== input.stripeSubscriptionId) {
        await tx.subscription.update({
          where: { id: current.id },
          data: { isCurrent: false },
        });
      }

      const existingByStripeId = await tx.subscription.findUnique({
        where: { stripeSubscriptionId: input.stripeSubscriptionId },
      });

      const subscription = existingByStripeId
        ? await tx.subscription.update({
            where: { id: existingByStripeId.id },
            data: {
              companyId: input.companyId,
              planId: input.planId,
              status: input.status,
              stripeCustomerId: input.stripeCustomerId ?? null,
              currentPeriodStart: input.currentPeriodStart ?? null,
              currentPeriodEnd: input.currentPeriodEnd ?? null,
              startsAt: input.startsAt ?? null,
              trialEndsAt: input.trialEndsAt ?? null,
              cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
              canceledAt: input.canceledAt ?? null,
              isCurrent: true,
              version: { increment: 1 },
            },
          })
        : await tx.subscription.create({
            data: {
              companyId: input.companyId,
              planId: input.planId,
              status: input.status,
              stripeSubscriptionId: input.stripeSubscriptionId,
              stripeCustomerId: input.stripeCustomerId ?? null,
              currentPeriodStart: input.currentPeriodStart ?? null,
              currentPeriodEnd: input.currentPeriodEnd ?? null,
              startsAt: input.startsAt ?? null,
              trialEndsAt: input.trialEndsAt ?? null,
              cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
              canceledAt: input.canceledAt ?? null,
              isCurrent: true,
            },
          });

      await tx.company.update({
        where: { id: input.companyId },
        data: {
          currentPlanId: input.planId,
          subscriptionStatus: input.status,
          stripeCustomerId: input.stripeCustomerId ?? undefined,
        },
      });

      return subscription;
    });
  }

  async downgradeCompanyToFree(input: { companyId: string; freePlanId: string; stripeCustomerId?: string | null }) {
    return prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { companyId: input.companyId, isCurrent: true },
        data: { isCurrent: false },
      });

      const freeSubscription = await tx.subscription.create({
        data: {
          companyId: input.companyId,
          planId: input.freePlanId,
          status: "FREE",
          stripeCustomerId: input.stripeCustomerId ?? null,
          startsAt: new Date(),
          isCurrent: true,
        },
      });

      await tx.company.update({
        where: { id: input.companyId },
        data: {
          currentPlanId: input.freePlanId,
          subscriptionStatus: "FREE",
        },
      });

      return freeSubscription;
    });
  }
}

