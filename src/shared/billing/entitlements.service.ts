import { PlanCode, PostStatus, UsageMetric as PrismaUsageMetric } from "@prisma/client";
import { prisma } from "../prisma/prismaClient.js";
import type { PlanFeatureKey } from "./entitlements.js";
import { getCurrentMonthPeriodStartUtc, type UsageMetric } from "./usageMetrics.js";

export type CompanyEntitlements = {
  companyId: string;
  planCode: PlanCode;
  features: Record<PlanFeatureKey, boolean>;
  limits: Record<UsageMetric, number | null>;
};

export class EntitlementsService {
  async getCompanyEntitlements(companyId: string): Promise<CompanyEntitlements> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        currentPlan: {
          select: {
            code: true,
            maxActivePosts: true,
            maxBidsPerMonth: true,
            maxTeamMembers: true,
            hasPromotedPosts: true,
            hasAnalytics: true,
            hasRouteAlerts: true,
            hasPrioritySupport: true,
          },
        },
      },
    });

    if (!company) {
      return {
        companyId,
        planCode: PlanCode.FREE,
        features: {
          PROMOTED_POSTS: false,
          ANALYTICS: false,
          ROUTE_ALERTS: false,
          PRIORITY_PLACEMENT: false,
          CSV_EXPORT: false,
        },
        limits: {
          ACTIVE_POSTS: null,
          BIDS_PER_MONTH: null,
          TEAM_MEMBERS: null,
          PROMOTED_POSTS_PER_MONTH: 0,
        },
      };
    }

    const plan = company.currentPlan;
    if (!plan) {
      return {
        companyId: company.id,
        planCode: PlanCode.FREE,
        features: {
          PROMOTED_POSTS: false,
          ANALYTICS: false,
          ROUTE_ALERTS: false,
          PRIORITY_PLACEMENT: false,
          CSV_EXPORT: false,
        },
        limits: {
          ACTIVE_POSTS: null,
          BIDS_PER_MONTH: null,
          TEAM_MEMBERS: null,
          PROMOTED_POSTS_PER_MONTH: 0,
        },
      };
    }

    const isPro = plan.code === PlanCode.PRO;

    return {
      companyId: company.id,
      planCode: plan.code,
      features: {
        PROMOTED_POSTS: plan.hasPromotedPosts,
        ANALYTICS: plan.hasAnalytics,
        ROUTE_ALERTS: plan.hasRouteAlerts,
        PRIORITY_PLACEMENT: plan.hasPrioritySupport,
        CSV_EXPORT: isPro,
      },
      limits: {
        ACTIVE_POSTS: plan.maxActivePosts,
        BIDS_PER_MONTH: plan.maxBidsPerMonth,
        TEAM_MEMBERS: plan.maxTeamMembers,
        PROMOTED_POSTS_PER_MONTH: plan.hasPromotedPosts ? null : 0,
      },
    };
  }

  async hasFeature(companyId: string, feature: PlanFeatureKey) {
    const entitlements = await this.getCompanyEntitlements(companyId);

    return {
      allowed: entitlements.features[feature],
      entitlements,
    };
  }

  async getUsage(companyId: string, metric: UsageMetric) {
    const entitlements = await this.getCompanyEntitlements(companyId);
    const periodStart = getCurrentMonthPeriodStartUtc();

    let used = 0;

    if (metric === "ACTIVE_POSTS") {
      used = await prisma.post.count({
        where: {
          companyId,
          deletedAt: null,
          status: { in: [PostStatus.OPEN, PostStatus.ASSIGNED] },
        },
      });
    }

    if (metric === "BIDS_PER_MONTH") {
      const existingCounter = await prisma.usageCounter.findUnique({
        where: {
          companyId_metric_periodStart: {
            companyId,
            metric: PrismaUsageMetric.BIDS_PER_MONTH,
            periodStart,
          },
        },
        select: { used: true },
      });

      if (existingCounter) {
        used = existingCounter.used;
      } else {
        const seeded = await prisma.bid.count({
          where: {
            carrierCompanyId: companyId,
            deletedAt: null,
            createdAt: { gte: periodStart },
          },
        });

        const counter = await prisma.usageCounter.upsert({
          where: {
            companyId_metric_periodStart: {
              companyId,
              metric: PrismaUsageMetric.BIDS_PER_MONTH,
              periodStart,
            },
          },
          update: {},
          create: {
            companyId,
            metric: PrismaUsageMetric.BIDS_PER_MONTH,
            periodStart,
            used: seeded,
            limitSnapshot: entitlements.limits.BIDS_PER_MONTH,
            planCodeSnapshot: entitlements.planCode,
          },
          select: { used: true },
        });

        used = counter.used;
      }
    }

    if (metric === "TEAM_MEMBERS") {
      used = await prisma.user.count({
        where: {
          companyId,
          deletedAt: null,
          isActive: true,
        },
      });
    }

    if (metric === "PROMOTED_POSTS_PER_MONTH") {
      used = await prisma.post.count({
        where: {
          companyId,
          deletedAt: null,
          isPromoted: true,
          createdAt: { gte: periodStart },
        },
      });
    }

    return {
      used,
      limit: entitlements.limits[metric],
      periodStart,
      entitlements,
    };
  }
}
