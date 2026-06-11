import {
  CompanyCreditTxType,
  JobSeekerCreditTxType,
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
  async hasBillingEventByProviderEventId(providerEventId: string) {
    const event = await prisma.billingEvent.findUnique({
      where: { providerEventId },
      select: { id: true },
    });

    return Boolean(event);
  }

  async getJobSeekerCheckoutSessionByStripeId(stripeCheckoutSessionId: string) {
    return prisma.jobSeekerCheckoutSession.findUnique({
      where: { stripeCheckoutSessionId },
      include: { creditPack: true },
    });
  }

  async getCompanyCreditCheckoutSessionByStripeId(stripeCheckoutSessionId: string) {
    return prisma.companyCreditCheckoutSession.findUnique({
      where: { stripeCheckoutSessionId },
      include: { creditPack: true },
    });
  }

  async markJobSeekerCheckoutCompleted(stripeCheckoutSessionId: string) {
    return prisma.jobSeekerCheckoutSession.updateMany({
      where: { stripeCheckoutSessionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  async grantJobSeekerCreditsFromCheckout(input: {
    checkoutSessionId: string;
    stripeCheckoutSessionId: string;
    userId: string;
    amountCredits: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const existingCredit = await tx.jobSeekerCreditTransaction.findFirst({
        where: {
          type: JobSeekerCreditTxType.PURCHASE,
          reasonCode: "CHECKOUT_TOPUP",
          referenceType: "JOB_SEEKER_CHECKOUT",
          referenceId: input.checkoutSessionId,
        },
      });

      if (existingCredit) {
        return { inserted: false, transactionId: existingCredit.id };
      }

      const wallet =
        (await tx.jobSeekerWallet.findUnique({ where: { userId: input.userId } })) ??
        (await tx.jobSeekerWallet.create({ data: { userId: input.userId } }));

      const updatedWallet = await tx.jobSeekerWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCredits: { increment: input.amountCredits },
          version: { increment: 1 },
        },
      });

      const creditTx = await tx.jobSeekerCreditTransaction.create({
        data: {
          walletId: wallet.id,
          userId: input.userId,
          type: JobSeekerCreditTxType.PURCHASE,
          amountCredits: input.amountCredits,
          reasonCode: "CHECKOUT_TOPUP",
          referenceType: "JOB_SEEKER_CHECKOUT",
          referenceId: input.checkoutSessionId,
          stripePaymentRef: input.stripeCheckoutSessionId,
          balanceAfter: updatedWallet.balanceCredits,
        },
      });

      await tx.jobSeekerCheckoutSession.updateMany({
        where: { stripeCheckoutSessionId: input.stripeCheckoutSessionId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      return { inserted: true, transactionId: creditTx.id };
    });
  }

  async grantCompanyCreditsFromCheckout(input: {
    amountCredits: number;
    checkoutSessionId: string;
    companyId: string;
    stripeCheckoutSessionId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existingCredit = await tx.companyCreditTransaction.findFirst({
        where: {
          type: CompanyCreditTxType.PURCHASE,
          reasonCode: "CHECKOUT_TOPUP",
          referenceType: "COMPANY_CREDIT_CHECKOUT",
          referenceId: input.checkoutSessionId,
        },
      });

      if (existingCredit) {
        return { inserted: false, transactionId: existingCredit.id };
      }

      const wallet =
        (await tx.companyCreditWallet.findUnique({ where: { companyId: input.companyId } })) ??
        (await tx.companyCreditWallet.create({ data: { companyId: input.companyId } }));

      const updatedWallet = await tx.companyCreditWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCredits: { increment: input.amountCredits },
          version: { increment: 1 },
        },
      });

      const creditTx = await tx.companyCreditTransaction.create({
        data: {
          amountCredits: input.amountCredits,
          balanceAfter: updatedWallet.balanceCredits,
          companyId: input.companyId,
          reasonCode: "CHECKOUT_TOPUP",
          referenceId: input.checkoutSessionId,
          referenceType: "COMPANY_CREDIT_CHECKOUT",
          stripePaymentRef: input.stripeCheckoutSessionId,
          type: CompanyCreditTxType.PURCHASE,
          walletId: wallet.id,
        },
      });

      await tx.companyCreditCheckoutSession.updateMany({
        where: { stripeCheckoutSessionId: input.stripeCheckoutSessionId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      return { inserted: true, transactionId: creditTx.id };
    });
  }

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
    return prisma.subscription.findFirst({
      where: { companyId, isCurrent: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
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
      const current = await tx.subscription.findFirst({
        where: { companyId: input.companyId, isCurrent: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });

      if (current && current.stripeSubscriptionId !== input.stripeSubscriptionId) {
        await tx.subscription.updateMany({
          where: { companyId: input.companyId, isCurrent: true },
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

      // Keep a single active current subscription per company even without a DB unique constraint.
      await tx.subscription.updateMany({
        where: {
          companyId: input.companyId,
          isCurrent: true,
          NOT: { id: subscription.id },
        },
        data: { isCurrent: false },
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

