import { CompanyCreditTxType, UsageMetric } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

export class CompanyCreditsRepository {
  async ensureWallet(companyId: string) {
    const existing = await prisma.companyCreditWallet.findUnique({ where: { companyId } });
    if (existing) return existing;
    return prisma.companyCreditWallet.create({ data: { companyId } });
  }

  async listCreditPacks(activeOnly = true) {
    return prisma.companyCreditPack.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ priceAmount: "asc" }, { createdAt: "asc" }],
    });
  }

  async findActiveCreditPackByCode(code: string) {
    return prisma.companyCreditPack.findFirst({ where: { code, isActive: true } });
  }

  async createCheckoutSession(input: {
    amountCredits: number;
    amountPaid: number;
    companyId: string;
    creditPackId: string;
    currency: string;
    expiresAt?: Date | null;
    idempotencyKey?: string;
    stripeCheckoutSessionId: string;
  }) {
    return prisma.companyCreditCheckoutSession.create({
      data: {
        amountCredits: input.amountCredits,
        amountPaid: input.amountPaid,
        companyId: input.companyId,
        creditPackId: input.creditPackId,
        currency: input.currency,
        expiresAt: input.expiresAt ?? null,
        idempotencyKey: input.idempotencyKey,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      },
    });
  }

  async findCheckoutSessionByIdempotencyKey(companyId: string, idempotencyKey: string) {
    return prisma.companyCreditCheckoutSession.findFirst({
      where: { companyId, idempotencyKey },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findCheckoutSessionById(id: string) {
    return prisma.companyCreditCheckoutSession.findUnique({ where: { id }, include: { creditPack: true } });
  }

  async findCheckoutSessionByStripeId(stripeCheckoutSessionId: string) {
    return prisma.companyCreditCheckoutSession.findUnique({
      where: { stripeCheckoutSessionId },
      include: { creditPack: true },
    });
  }

  async listTransactionsByCompany(input: { companyId: string; page: number; pageSize: number }) {
    return prisma.companyCreditTransaction.findMany({
      where: { companyId: input.companyId },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    });
  }

  async getUsageCounter(input: { companyId: string; metric: UsageMetric; periodStart: Date }) {
    return prisma.usageCounter.findUnique({
      where: {
        companyId_metric_periodStart: {
          companyId: input.companyId,
          metric: input.metric,
          periodStart: input.periodStart,
        },
      },
    });
  }

  async adjustCreditsByAdmin(input: { amountCredits: number; companyId: string; reasonCode: string }) {
    return prisma.$transaction(async (tx) => {
      const wallet =
        (await tx.companyCreditWallet.findUnique({ where: { companyId: input.companyId } })) ??
        (await tx.companyCreditWallet.create({ data: { companyId: input.companyId } }));

      if (input.amountCredits < 0 && wallet.balanceCredits < Math.abs(input.amountCredits)) {
        throw new Error("INSUFFICIENT_BALANCE_FOR_ADJUSTMENT");
      }

      const updatedWallet = await tx.companyCreditWallet.update({
        where: { id: wallet.id },
        data: { balanceCredits: { increment: input.amountCredits }, version: { increment: 1 } },
      });

      const transaction = await tx.companyCreditTransaction.create({
        data: {
          amountCredits: input.amountCredits,
          balanceAfter: updatedWallet.balanceCredits,
          companyId: input.companyId,
          reasonCode: input.reasonCode,
          referenceId: wallet.id,
          referenceType: "MANUAL_ADJUSTMENT",
          type: CompanyCreditTxType.ADJUSTMENT,
          walletId: wallet.id,
        },
      });

      return { transaction, wallet: updatedWallet };
    });
  }
}
