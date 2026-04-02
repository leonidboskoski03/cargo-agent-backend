import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, PlanCode, UserRole, UsageMetric } from "@prisma/client";
import { initRuntime, isDatabaseAvailable } from "./_helpers.js";
import { requestContext } from "../../src/shared/middleware/requestContext.middleware.js";
import { errorHandler, notFoundHandler } from "../../src/shared/errors/errorHandler.js";
import { requireAuth } from "../../src/shared/middleware/auth.middleware.js";
import { requirePlanFeature } from "../../src/shared/middleware/requirePlanFeature.middleware.js";
import { enforceUsageLimit } from "../../src/shared/middleware/enforceUsageLimit.middleware.js";
import { getCurrentMonthPeriodStartUtc } from "../../src/shared/billing/usageMetrics.js";

describe("db-backed entitlements enforcement", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  }, 20_000);

  it("ignores spoofed plan header and enforces feature access from DB", async () => {
    const { prisma, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = express();
    app.use(requestContext);
    app.use(express.json());
    app.get("/feature", requireAuth, requirePlanFeature("PROMOTED_POSTS"), (_req, res) => {
      res.status(200).json({ success: true, data: { allowed: true } });
    });
    app.use(notFoundHandler);
    app.use(errorHandler);

    const suffix = `${Date.now()}-feature`;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: {
        isActive: true,
        hasPromotedPosts: false,
      },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        hasPromotedPosts: false,
      },
      select: { id: true },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: {
        isActive: true,
        hasPromotedPosts: true,
      },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
        hasPromotedPosts: true,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Entitlement Co ${suffix}`,
        registrationNumber: `ENT-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Feature",
        lastName: "Admin",
        email: `feature-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
      select: {
        id: true,
        role: true,
        email: true,
      },
    });

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: company.id,
      email: user.email,
    });

    try {
      const spoofed = await request(app)
        .get("/feature")
        .set("Authorization", `Bearer ${token}`)
        .set("x-company-plan", "PRO");

      expect(spoofed.statusCode).toBe(403);
      expect(spoofed.body.error.code).toBe("PLAN_FEATURE_REQUIRED");

      await prisma.company.update({
        where: { id: company.id },
        data: {
          currentPlanId: proPlan.id,
          subscriptionStatus: "ACTIVE",
        },
      });

      const upgraded = await request(app)
        .get("/feature")
        .set("Authorization", `Bearer ${token}`)
        .set("x-company-plan", "FREE");

      expect(upgraded.statusCode).toBe(200);
      expect(upgraded.body.success).toBe(true);
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);

  it("enforces team-members usage limit from DB plan limits", async () => {
    const { prisma, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = express();
    app.use(requestContext);
    app.use(express.json());
    app.get("/usage", requireAuth, enforceUsageLimit("TEAM_MEMBERS"), (_req, res) => {
      res.status(200).json({ success: true, data: { allowed: true } });
    });
    app.use(notFoundHandler);
    app.use(errorHandler);

    const suffix = `${Date.now()}-usage`;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: {
        isActive: true,
        maxTeamMembers: 1,
      },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        maxTeamMembers: 1,
      },
      select: { id: true },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: {
        isActive: true,
        maxTeamMembers: 5,
      },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
        maxTeamMembers: 5,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Usage Co ${suffix}`,
        registrationNumber: `USG-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Usage",
        lastName: "Admin",
        email: `usage-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
      select: {
        id: true,
        role: true,
        email: true,
      },
    });

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: company.id,
      email: user.email,
    });

    try {
      const atLimit = await request(app)
        .get("/usage")
        .set("Authorization", `Bearer ${token}`)
        .set("x-company-plan", "PRO");

      expect(atLimit.statusCode).toBe(403);
      expect(atLimit.body.error.code).toBe("USAGE_LIMIT_REACHED");
      expect(atLimit.body.error.details.metric).toBe("TEAM_MEMBERS");
      expect(atLimit.body.error.details.limit).toBe(1);

      await prisma.company.update({
        where: { id: company.id },
        data: {
          currentPlanId: proPlan.id,
          subscriptionStatus: "ACTIVE",
        },
      });

      const afterUpgrade = await request(app)
        .get("/usage")
        .set("Authorization", `Bearer ${token}`)
        .set("x-company-plan", "FREE");

      expect(afterUpgrade.statusCode).toBe(200);
      expect(afterUpgrade.body.success).toBe(true);
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);

  it("resets BIDS_PER_MONTH by periodStart and ignores previous-month counters", async () => {
    const { prisma, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = express();
    app.use(requestContext);
    app.use(express.json());
    app.get("/usage-bids", requireAuth, enforceUsageLimit("BIDS_PER_MONTH"), (_req, res) => {
      res.status(200).json({ success: true, data: { allowed: true } });
    });
    app.use(notFoundHandler);
    app.use(errorHandler);

    const suffix = `${Date.now()}-period`;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: {
        isActive: true,
        maxBidsPerMonth: 1,
      },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        maxBidsPerMonth: 1,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Period Co ${suffix}`,
        registrationNumber: `PER-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Period",
        lastName: "Admin",
        email: `period-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
      select: { id: true, role: true, email: true },
    });

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: company.id,
      email: user.email,
    });

    const currentPeriodStart = getCurrentMonthPeriodStartUtc();
    const previousPeriodStart = new Date(Date.UTC(currentPeriodStart.getUTCFullYear(), currentPeriodStart.getUTCMonth() - 1, 1, 0, 0, 0, 0));

    try {
      await prisma.usageCounter.create({
        data: {
          companyId: company.id,
          metric: UsageMetric.BIDS_PER_MONTH,
          periodStart: previousPeriodStart,
          used: 999,
          limitSnapshot: 1,
          planCodeSnapshot: PlanCode.FREE,
        },
      });

      const previousIgnored = await request(app)
        .get("/usage-bids")
        .set("Authorization", `Bearer ${token}`);

      expect(previousIgnored.statusCode).toBe(200);

      await prisma.usageCounter.upsert({
        where: {
          companyId_metric_periodStart: {
            companyId: company.id,
            metric: UsageMetric.BIDS_PER_MONTH,
            periodStart: currentPeriodStart,
          },
        },
        update: { used: 1 },
        create: {
          companyId: company.id,
          metric: UsageMetric.BIDS_PER_MONTH,
          periodStart: currentPeriodStart,
          used: 1,
          limitSnapshot: 1,
          planCodeSnapshot: PlanCode.FREE,
        },
      });

      const currentBlocked = await request(app)
        .get("/usage-bids")
        .set("Authorization", `Bearer ${token}`);

      expect(currentBlocked.statusCode).toBe(403);
      expect(currentBlocked.body.error.code).toBe("USAGE_LIMIT_REACHED");
      expect(currentBlocked.body.error.details.metric).toBe("BIDS_PER_MONTH");
      expect(currentBlocked.body.error.details.limit).toBe(1);
    } finally {
      await prisma.usageCounter.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);
});

