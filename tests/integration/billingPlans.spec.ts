import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { BillingEventStatus, BillingEventType, BillingProvider, CompanyType, PlanCode, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("billing and plans endpoints", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("lists active plans by default and includes inactive when requested", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const activePlan = await prisma.plan.create({
      data: {
        code: PlanCode.PRO,
        name: `Pro ${suffix}`,
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
      },
    });

    const inactivePlan = await prisma.plan.create({
      data: {
        code: PlanCode.FREE,
        name: `Free ${suffix}`,
        priceAmount: 0,
        currency: "EUR",
        isActive: false,
      },
    });

    try {
      const activeOnlyResponse = await request(app).get("/api/v1/plans");
      expect(activeOnlyResponse.statusCode).toBe(200);
      const activePlanIds = (activeOnlyResponse.body.data as Array<{ id: string }>).map((plan) => plan.id);
      expect(activePlanIds).toContain(activePlan.id);
      expect(activePlanIds).not.toContain(inactivePlan.id);

      const includeInactiveResponse = await request(app).get("/api/v1/plans").query({ activeOnly: false });
      expect(includeInactiveResponse.statusCode).toBe(200);
      const allPlanIds = (includeInactiveResponse.body.data as Array<{ id: string }>).map((plan) => plan.id);
      expect(allPlanIds).toContain(activePlan.id);
      expect(allPlanIds).toContain(inactivePlan.id);
    } finally {
      await prisma.plan.deleteMany({ where: { id: { in: [activePlan.id, inactivePlan.id] } } });
    }
  }, 20_000);

  it("lists billing events for authenticated company scope", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Billing Co ${suffix}`,
        registrationNumber: `BIL-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Bill",
        lastName: "Admin",
        email: `billing-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const token = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const event = await prisma.billingEvent.create({
      data: {
        companyId: company.id,
        eventType: BillingEventType.CHECKOUT_COMPLETED,
        provider: BillingProvider.STRIPE,
        providerEventId: `evt-${suffix}`,
        status: BillingEventStatus.SUCCEEDED,
      },
    });

    try {
      const response = await request(app).get("/api/v1/billing/events").set("Authorization", token);
      expect(response.statusCode).toBe(200);
      const ids = (response.body.data as Array<{ id: string }>).map((item) => item.id);
      expect(ids).toContain(event.id);
    } finally {
      await prisma.billingEvent.deleteMany({ where: { id: event.id } });
      await prisma.user.deleteMany({ where: { id: admin.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);
});

