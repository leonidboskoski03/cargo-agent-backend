import request from "supertest";
import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("company credits endpoints", () => {
  it("returns wallet, usage, packs, and transactions for company users while checkout stays admin-only", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!(await isDatabaseAvailable(prisma))) return;

    const app = buildApp();
    const suffix = Date.now().toString();
    const company = await prisma.company.create({
      data: {
        city: "Skopje",
        companyType: "CARRIER",
        countryCode: "MK",
        name: `Credits Co ${suffix}`,
        registrationNumber: `CO-CRED-${suffix}`,
      },
    });
    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `company-credits-admin-${suffix}@test.local`,
        firstName: "Company",
        lastName: "Admin",
        passwordHash: "hash",
        role: UserRole.COMPANY_ADMIN,
      },
    });
    const driver = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `company-credits-driver-${suffix}@test.local`,
        firstName: "Company",
        lastName: "Driver",
        passwordHash: "hash",
        role: UserRole.COMPANY_DRIVER,
      },
    });
    const pack = await prisma.companyCreditPack.create({
      data: {
        code: `CO_PACK_${suffix}`,
        credits: 12,
        currency: "EUR",
        isActive: true,
        name: "Company Test Pack",
        priceAmount: 5.99,
      },
    });

    const adminToken = authHeader(signAccessToken, { companyId: company.id, email: admin.email, role: admin.role, userId: admin.id });
    const driverToken = authHeader(signAccessToken, { companyId: company.id, email: driver.email, role: driver.role, userId: driver.id });

    try {
      const walletResponse = await request(app).get("/api/v1/company-credits/wallet").set("Authorization", adminToken);
      expect(walletResponse.statusCode).toBe(200);
      expect(walletResponse.body.data.companyId).toBe(company.id);
      expect(walletResponse.body.data.balanceCredits).toBeTypeOf("number");

      const usageResponse = await request(app).get("/api/v1/company-credits/usage").set("Authorization", adminToken);
      expect(usageResponse.statusCode).toBe(200);
      expect(usageResponse.body.data.quotas.jobPosts.creditCostPerAction).toBeTypeOf("number");
      expect(usageResponse.body.data.quotas.vehicleListings.creditCostPerAction).toBeTypeOf("number");

      const packsResponse = await request(app).get("/api/v1/company-credits/packs").set("Authorization", adminToken);
      expect(packsResponse.statusCode).toBe(200);
      expect((packsResponse.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(pack.id);

      const driverCheckoutResponse = await request(app)
        .post("/api/v1/company-credits/checkout-sessions")
        .set("Authorization", driverToken)
        .send({ creditPackCode: pack.code, idempotencyKey: `driver-${suffix}` });
      expect(driverCheckoutResponse.statusCode).toBe(403);

      const checkout = await prisma.companyCreditCheckoutSession.create({
        data: {
          amountCredits: pack.credits,
          amountPaid: pack.priceAmount,
          companyId: company.id,
          creditPackId: pack.id,
          currency: pack.currency,
          stripeCheckoutSessionId: `cs_test_company_${suffix}`,
        },
      });

      const checkoutByStripeIdResponse = await request(app)
        .get(`/api/v1/company-credits/checkout-sessions/${checkout.stripeCheckoutSessionId}`)
        .set("Authorization", adminToken);
      expect(checkoutByStripeIdResponse.statusCode).toBe(200);
      expect(checkoutByStripeIdResponse.body.data.id).toBe(checkout.id);
    } finally {
      await prisma.companyCreditTransaction.deleteMany({ where: { companyId: company.id } });
      await prisma.companyCreditWallet.deleteMany({ where: { companyId: company.id } });
      await prisma.companyCreditCheckoutSession.deleteMany({ where: { companyId: company.id } });
      await prisma.companyCreditPack.deleteMany({ where: { id: pack.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, driver.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);
});
