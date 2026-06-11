import { CompanyCreditTxType, JobSeekerCreditTxType, JobSeekerUsageMetric, UsageMetric } from "@prisma/client";
import { EntitlementsService } from "../billing/entitlements.service.js";
import { getCurrentMonthPeriodStartUtc } from "../billing/usageMetrics.js";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../prisma/prismaClient.js";

type BillingMetadata = {
  creditCost: number;
  mode: "INCLUDED_QUOTA" | "CREDITS";
  quotaLimit?: number | null;
  quotaRemaining?: number;
  quotaUsed?: number;
  walletBalanceCredits: number;
};

const entitlementsService = new EntitlementsService();

function insufficientCredits(details: Record<string, unknown>) {
  return new AppError(402, "INSUFFICIENT_CREDITS", "Not enough credits for this action", details);
}

export async function spendCompanyCredits(input: {
  companyId: string;
  creditCost: number;
  reasonCode: string;
  referenceId: string;
  referenceType: string;
}) {
  return prisma.$transaction(async (tx) => {
    const wallet =
      (await tx.companyCreditWallet.findUnique({ where: { companyId: input.companyId } })) ??
      (await tx.companyCreditWallet.create({ data: { companyId: input.companyId } }));

    const debit = await tx.companyCreditWallet.updateMany({
      where: { id: wallet.id, balanceCredits: { gte: input.creditCost } },
      data: { balanceCredits: { decrement: input.creditCost }, version: { increment: 1 } },
    });

    if (debit.count === 0) {
      throw insufficientCredits({
        creditCost: input.creditCost,
        walletBalanceCredits: wallet.balanceCredits,
      });
    }

    const updatedWallet = await tx.companyCreditWallet.findUnique({
      where: { id: wallet.id },
      select: { balanceCredits: true },
    });

    await tx.companyCreditTransaction.create({
      data: {
        amountCredits: -input.creditCost,
        balanceAfter: updatedWallet?.balanceCredits ?? 0,
        companyId: input.companyId,
        reasonCode: input.reasonCode,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        type: CompanyCreditTxType.SPEND,
        walletId: wallet.id,
      },
    });

    return updatedWallet?.balanceCredits ?? 0;
  });
}

export async function spendJobSeekerCredits(input: {
  creditCost: number;
  reasonCode: string;
  referenceId: string;
  referenceType: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const wallet =
      (await tx.jobSeekerWallet.findUnique({ where: { userId: input.userId } })) ??
      (await tx.jobSeekerWallet.create({ data: { userId: input.userId } }));

    const debit = await tx.jobSeekerWallet.updateMany({
      where: { id: wallet.id, balanceCredits: { gte: input.creditCost } },
      data: { balanceCredits: { decrement: input.creditCost }, version: { increment: 1 } },
    });

    if (debit.count === 0) {
      throw insufficientCredits({
        creditCost: input.creditCost,
        walletBalanceCredits: wallet.balanceCredits,
      });
    }

    const updatedWallet = await tx.jobSeekerWallet.findUnique({
      where: { id: wallet.id },
      select: { balanceCredits: true },
    });

    await tx.jobSeekerCreditTransaction.create({
      data: {
        amountCredits: -input.creditCost,
        balanceAfter: updatedWallet?.balanceCredits ?? 0,
        reasonCode: input.reasonCode,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        type: JobSeekerCreditTxType.SPEND,
        userId: input.userId,
        walletId: wallet.id,
      },
    });

    return updatedWallet?.balanceCredits ?? 0;
  });
}

export async function useCompanyMonthlyQuotaOrCredits(input: {
  companyId: string;
  creditCost: number;
  limit: number;
  metric: Extract<UsageMetric, "COMPANY_JOB_POSTS_PER_MONTH" | "COMPANY_VEHICLE_LISTINGS_PER_MONTH">;
  reasonCode: string;
  referenceId: string;
  referenceType: string;
}): Promise<BillingMetadata> {
  const periodStart = getCurrentMonthPeriodStartUtc();
  const counter = await prisma.usageCounter.upsert({
    where: {
      companyId_metric_periodStart: {
        companyId: input.companyId,
        metric: input.metric,
        periodStart,
      },
    },
    create: {
      companyId: input.companyId,
      limitSnapshot: input.limit,
      metric: input.metric,
      periodStart,
      planCodeSnapshot: (await entitlementsService.getCompanyEntitlements(input.companyId)).planCode,
      used: 0,
    },
    update: { limitSnapshot: input.limit },
  });

  const quota = await prisma.usageCounter.updateMany({
    where: { id: counter.id, used: { lt: input.limit } },
    data: { used: { increment: 1 }, limitSnapshot: input.limit },
  });

  if (quota.count > 0) {
    const wallet = await prisma.companyCreditWallet.findUnique({ where: { companyId: input.companyId } });
    const used = counter.used + 1;
    return {
      creditCost: input.creditCost,
      mode: "INCLUDED_QUOTA",
      quotaLimit: input.limit,
      quotaRemaining: Math.max(input.limit - used, 0),
      quotaUsed: used,
      walletBalanceCredits: wallet?.balanceCredits ?? 0,
    };
  }

  const walletBalanceCredits = await spendCompanyCredits(input);
  return {
    creditCost: input.creditCost,
    mode: "CREDITS",
    quotaLimit: input.limit,
    quotaRemaining: 0,
    quotaUsed: counter.used,
    walletBalanceCredits,
  };
}

export async function useJobSeekerMonthlyQuotaOrCredits(input: {
  creditCost: number;
  limit: number;
  metric: Extract<JobSeekerUsageMetric, "ACTIVE_LOOKING_LISTINGS" | "VEHICLE_LISTINGS_PER_MONTH">;
  reasonCode: string;
  referenceId: string;
  referenceType: string;
  userId: string;
}): Promise<BillingMetadata> {
  const periodStart = getCurrentMonthPeriodStartUtc();
  const counter = await prisma.jobSeekerUsageCounter.upsert({
    where: {
      userId_metric_periodStart: {
        userId: input.userId,
        metric: input.metric,
        periodStart,
      },
    },
    create: {
      limitSnapshot: input.limit,
      metric: input.metric,
      periodStart,
      used: 0,
      userId: input.userId,
    },
    update: { limitSnapshot: input.limit },
  });

  const quota = await prisma.jobSeekerUsageCounter.updateMany({
    where: { id: counter.id, used: { lt: input.limit } },
    data: { used: { increment: 1 }, limitSnapshot: input.limit },
  });

  if (quota.count > 0) {
    const wallet = await prisma.jobSeekerWallet.findUnique({ where: { userId: input.userId } });
    const used = counter.used + 1;
    return {
      creditCost: input.creditCost,
      mode: "INCLUDED_QUOTA",
      quotaLimit: input.limit,
      quotaRemaining: Math.max(input.limit - used, 0),
      quotaUsed: used,
      walletBalanceCredits: wallet?.balanceCredits ?? 0,
    };
  }

  const walletBalanceCredits = await spendJobSeekerCredits(input);
  return {
    creditCost: input.creditCost,
    mode: "CREDITS",
    quotaLimit: input.limit,
    quotaRemaining: 0,
    quotaUsed: counter.used,
    walletBalanceCredits,
  };
}

export async function useCompanyActivePostQuotaOrCredits(input: {
  companyId: string;
  creditCost: number;
  reasonCode: string;
  referenceId: string;
  referenceType: string;
}) {
  const usage = await entitlementsService.getUsage(input.companyId, "ACTIVE_POSTS");
  if (usage.limit === null || usage.used <= usage.limit) {
    const wallet = await prisma.companyCreditWallet.findUnique({ where: { companyId: input.companyId } });
    return {
      creditCost: input.creditCost,
      mode: "INCLUDED_QUOTA" as const,
      quotaLimit: usage.limit,
      quotaRemaining: usage.limit === null ? undefined : Math.max(usage.limit - usage.used, 0),
      quotaUsed: usage.used,
      walletBalanceCredits: wallet?.balanceCredits ?? 0,
    };
  }

  const walletBalanceCredits = await spendCompanyCredits(input);
  return {
    creditCost: input.creditCost,
    mode: "CREDITS" as const,
    quotaLimit: usage.limit,
    quotaRemaining: 0,
    quotaUsed: usage.used,
    walletBalanceCredits,
  };
}
