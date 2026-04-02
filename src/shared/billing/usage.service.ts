import { UsageMetric as PrismaUsageMetric } from "@prisma/client";
import { prisma } from "../prisma/prismaClient.js";
import { EntitlementsService } from "./entitlements.service.js";
import { getCurrentMonthPeriodStartUtc, type UsageMetric } from "./usageMetrics.js";

const entitlementsService = new EntitlementsService();

export class UsageService {
  async getUsage(companyId: string, metric: UsageMetric) {
    const usage = await entitlementsService.getUsage(companyId, metric);

    return {
      used: usage.used,
      limit: usage.limit,
      periodStart: usage.periodStart,
      planCode: usage.entitlements.planCode,
    };
  }

  async assertCanUse(companyId: string, metric: UsageMetric) {
    const usage = await this.getUsage(companyId, metric);

    if (usage.limit === null) {
      return {
        allowed: true,
        used: usage.used,
        limit: usage.limit,
        metric,
        periodStart: usage.periodStart,
        planCode: usage.planCode,
      };
    }

    return {
      allowed: usage.used < usage.limit,
      used: usage.used,
      limit: usage.limit,
      metric,
      periodStart: usage.periodStart,
      planCode: usage.planCode,
    };
  }

  async incrementMonthlyUsage(companyId: string, metric: Extract<UsageMetric, "BIDS_PER_MONTH" | "PROMOTED_POSTS_PER_MONTH">) {
    const periodStart = getCurrentMonthPeriodStartUtc();
    const entitlements = await entitlementsService.getCompanyEntitlements(companyId);

    return prisma.usageCounter.upsert({
      where: {
        companyId_metric_periodStart: {
          companyId,
          metric: metric as PrismaUsageMetric,
          periodStart,
        },
      },
      update: {
        used: { increment: 1 },
        limitSnapshot: entitlements.limits[metric],
        planCodeSnapshot: entitlements.planCode,
      },
      create: {
        companyId,
        metric: metric as PrismaUsageMetric,
        periodStart,
        used: 1,
        limitSnapshot: entitlements.limits[metric],
        planCodeSnapshot: entitlements.planCode,
      },
      select: {
        id: true,
        companyId: true,
        metric: true,
        used: true,
        periodStart: true,
      },
    });
  }
}
