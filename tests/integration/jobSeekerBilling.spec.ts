import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("job seeker billing endpoints", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("returns wallet and credit packs for job seeker", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Credit",
        lastName: "User",
        email: `jobseeker-billing-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const pack = await prisma.jobSeekerCreditPack.create({
      data: {
        code: `PACK_${suffix}`,
        name: "Starter Pack",
        credits: 25,
        priceAmount: 9.99,
        currency: "EUR",
        isActive: true,
      },
    });
    const inactivePack = await prisma.jobSeekerCreditPack.create({
      data: {
        code: `PACK_INACTIVE_${suffix}`,
        name: "Paused Pack",
        credits: 100,
        priceAmount: 29.99,
        currency: "EUR",
        isActive: false,
      },
    });

    const token = authHeader(signAccessToken, {
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    try {
      const walletResponse = await request(app).get("/api/v1/job-seeker-billing/wallet").set("Authorization", token);
      expect(walletResponse.statusCode).toBe(200);
      expect(walletResponse.body.data.userId).toBe(user.id);
      expect(walletResponse.body.data.balanceCredits).toBeTypeOf("number");

      const usageResponse = await request(app).get("/api/v1/job-seeker-billing/usage").set("Authorization", token);
      expect(usageResponse.statusCode).toBe(200);
      expect(usageResponse.body.data.userId).toBe(user.id);
      expect(usageResponse.body.data.wallet.balanceCredits).toBeTypeOf("number");
      expect(usageResponse.body.data.quotas.applications.limit).toBeTypeOf("number");
      expect(usageResponse.body.data.quotas.activeListings.limit).toBeTypeOf("number");

      const packsResponse = await request(app).get("/api/v1/job-seeker-billing/packs").set("Authorization", token);
      expect(packsResponse.statusCode).toBe(200);
      const packIds = (packsResponse.body.data as Array<{ id: string }>).map((item) => item.id);
      expect(packIds).toContain(pack.id);
      expect(packIds).not.toContain(inactivePack.id);

      const allPacksResponse = await request(app)
        .get("/api/v1/job-seeker-billing/packs")
        .set("Authorization", token)
        .query({ activeOnly: "0" });
      expect(allPacksResponse.statusCode).toBe(200);
      const allPackIds = (allPacksResponse.body.data as Array<{ id: string }>).map((item) => item.id);
      expect(allPackIds).toContain(pack.id);
      expect(allPackIds).toContain(inactivePack.id);

      const txResponse = await request(app)
        .get("/api/v1/job-seeker-billing/transactions")
        .set("Authorization", token)
        .query({ page: 1, pageSize: 10 });
      expect(txResponse.statusCode).toBe(200);
      expect(Array.isArray(txResponse.body.data)).toBe(true);

      const checkout = await prisma.jobSeekerCheckoutSession.create({
        data: {
          amountCredits: pack.credits,
          amountPaid: pack.priceAmount,
          creditPackId: pack.id,
          currency: pack.currency,
          stripeCheckoutSessionId: `cs_test_job_${suffix}`,
          userId: user.id,
        },
      });

      const checkoutByStripeIdResponse = await request(app)
        .get(`/api/v1/job-seeker-billing/checkout-sessions/${checkout.stripeCheckoutSessionId}`)
        .set("Authorization", token);
      expect(checkoutByStripeIdResponse.statusCode).toBe(200);
      expect(checkoutByStripeIdResponse.body.data.id).toBe(checkout.id);
    } finally {
      await prisma.jobSeekerCreditTransaction.deleteMany({ where: { userId: user.id } });
      await prisma.jobSeekerWallet.deleteMany({ where: { userId: user.id } });
      await prisma.jobSeekerCheckoutSession.deleteMany({ where: { userId: user.id } });
      await prisma.jobSeekerCreditPack.deleteMany({ where: { id: { in: [pack.id, inactivePack.id] } } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("forbids company admin from accessing job seeker wallet endpoint", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: "CARRIER",
        name: `Role Co ${suffix}`,
        registrationNumber: `ROLE-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Role",
        lastName: "Admin",
        email: `role-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const token = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    try {
      const response = await request(app).get("/api/v1/job-seeker-billing/wallet").set("Authorization", token);
      expect(response.statusCode).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    } finally {
      await prisma.user.deleteMany({ where: { id: admin.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);

  it("returns feature disabled for admin credit adjustment when internal flag is off", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: "CARRIER",
        name: `Adjust Co ${suffix}`,
        registrationNumber: `ADJ-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Adjust",
        lastName: "Admin",
        email: `adjust-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const target = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Target",
        lastName: "User",
        email: `adjust-target-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const token = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    try {
      const response = await request(app)
        .post("/api/v1/job-seeker-billing/admin/adjustments")
        .set("Authorization", token)
        .send({
          targetUserId: target.id,
          amountCredits: 5,
          reasonCode: "MANUAL_TEST_ADJUSTMENT",
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.error.code).toBe("FEATURE_DISABLED");
    } finally {
      await prisma.jobSeekerCreditTransaction.deleteMany({ where: { userId: target.id } });
      await prisma.jobSeekerWallet.deleteMany({ where: { userId: target.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, target.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);

  it("allows company admin to adjust job seeker credits when feature flag is enabled", async () => {
    if (!dbReady) {
      return;
    }

    vi.resetModules();
    process.env.INTERNAL_ADMIN_ADJUSTMENTS_ENABLED = "true";

    const { prisma, buildApp, signAccessToken } = await initRuntime();
    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: "CARRIER",
        name: `Adjust Enabled Co ${suffix}`,
        registrationNumber: `ADJ-EN-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Adjust",
        lastName: "Enabled",
        email: `adjust-enabled-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const target = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Target",
        lastName: "Enabled",
        email: `adjust-enabled-target-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const token = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    try {
      const response = await request(app)
        .post("/api/v1/job-seeker-billing/admin/adjustments")
        .set("Authorization", token)
        .send({
          targetUserId: target.id,
          amountCredits: 7,
          reasonCode: "MANUAL_ENABLE_TEST",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.targetUserId).toBe(target.id);
      expect(response.body.data.amountCredits).toBe(7);
      expect(response.body.data.balanceAfter).toBe(7);

      const wallet = await prisma.jobSeekerWallet.findUnique({ where: { userId: target.id } });
      expect(wallet?.balanceCredits).toBe(7);

      const ledger = await prisma.jobSeekerCreditTransaction.findMany({
        where: {
          userId: target.id,
          reasonCode: "MANUAL_ENABLE_TEST",
        },
      });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.amountCredits).toBe(7);

      const auditRows = await prisma.auditLog.findMany({
        where: {
          companyId: company.id,
          action: "JOB_SEEKER_CREDIT_ADJUSTED",
        },
      });
      expect(auditRows.length).toBeGreaterThanOrEqual(1);
    } finally {
      await prisma.auditLog.deleteMany({ where: { companyId: company.id, action: "JOB_SEEKER_CREDIT_ADJUSTED" } });
      await prisma.jobSeekerCreditTransaction.deleteMany({ where: { userId: target.id } });
      await prisma.jobSeekerWallet.deleteMany({ where: { userId: target.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, target.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
      process.env.INTERNAL_ADMIN_ADJUSTMENTS_ENABLED = "false";
      vi.resetModules();
    }
  }, 20_000);
});

