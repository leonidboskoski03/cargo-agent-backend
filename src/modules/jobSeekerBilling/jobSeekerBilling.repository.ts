import { prisma } from "../../shared/prisma/prismaClient.js";
import { JobSeekerCreditTxType, JobSeekerUsageMetric } from "@prisma/client";

export class JobSeekerBillingRepository {
  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        deletedAt: true,
      },
    });
  }

  async ensureWallet(userId: string) {
    const existing = await prisma.jobSeekerWallet.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    return prisma.jobSeekerWallet.create({
      data: { userId },
    });
  }

  async getWalletByUserId(userId: string) {
    return prisma.jobSeekerWallet.findUnique({ where: { userId } });
  }

  async listCreditPacks(activeOnly = true) {
    return prisma.jobSeekerCreditPack.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ priceAmount: "asc" }, { createdAt: "asc" }],
    });
  }

  async findActiveCreditPackByCode(code: string) {
    return prisma.jobSeekerCreditPack.findFirst({
      where: {
        code,
        isActive: true,
      },
    });
  }

  async createCheckoutSession(input: {
    userId: string;
    creditPackId: string;
    stripeCheckoutSessionId: string;
    amountCredits: number;
    amountPaid: number;
    currency: string;
    idempotencyKey?: string;
    expiresAt?: Date | null;
  }) {
    return prisma.jobSeekerCheckoutSession.create({
      data: {
        userId: input.userId,
        creditPackId: input.creditPackId,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        amountCredits: input.amountCredits,
        amountPaid: input.amountPaid,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        expiresAt: input.expiresAt ?? null,
      },
    });
  }

  async findCheckoutSessionByIdempotencyKey(userId: string, idempotencyKey: string) {
    return prisma.jobSeekerCheckoutSession.findFirst({
      where: {
        userId,
        idempotencyKey,
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findCheckoutSessionById(id: string) {
    return prisma.jobSeekerCheckoutSession.findUnique({
      where: { id },
      include: { creditPack: true },
    });
  }

  async listTransactionsByUser(input: { userId: string; page: number; pageSize: number }) {
    return prisma.jobSeekerCreditTransaction.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    });
  }

  async getUsageCounter(input: {
    userId: string;
    metric: JobSeekerUsageMetric;
    periodStart: Date;
  }) {
    return prisma.jobSeekerUsageCounter.findUnique({
      where: {
        userId_metric_periodStart: {
          userId: input.userId,
          metric: input.metric,
          periodStart: input.periodStart,
        },
      },
    });
  }

  async adjustCreditsByAdmin(input: {
    targetUserId: string;
    amountCredits: number;
    reasonCode: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const wallet =
        (await tx.jobSeekerWallet.findUnique({ where: { userId: input.targetUserId } })) ??
        (await tx.jobSeekerWallet.create({ data: { userId: input.targetUserId } }));

      if (input.amountCredits < 0 && wallet.balanceCredits < Math.abs(input.amountCredits)) {
        throw new Error("INSUFFICIENT_BALANCE_FOR_ADJUSTMENT");
      }

      const updatedWallet = await tx.jobSeekerWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCredits: {
            increment: input.amountCredits,
          },
          version: {
            increment: 1,
          },
        },
      });

      const transaction = await tx.jobSeekerCreditTransaction.create({
        data: {
          walletId: wallet.id,
          userId: input.targetUserId,
          type: JobSeekerCreditTxType.ADJUSTMENT,
          amountCredits: input.amountCredits,
          reasonCode: input.reasonCode,
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: wallet.id,
          balanceAfter: updatedWallet.balanceCredits,
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });
  }
}

