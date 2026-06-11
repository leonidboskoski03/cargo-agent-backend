import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, PlanCode, PostPriceType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("post usage limits", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("blocks FREE companies at active post limit and allows PRO under higher limit", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const existingFree = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
    const existingPro = await prisma.plan.findUnique({ where: { code: PlanCode.PRO } });

    const freeTargetLimit = existingFree?.maxActivePosts && existingFree.maxActivePosts > 0 ? existingFree.maxActivePosts : 1;
    const proTargetLimit =
      existingPro?.maxActivePosts && existingPro.maxActivePosts > freeTargetLimit
        ? existingPro.maxActivePosts
        : freeTargetLimit + 3;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: {
        maxActivePosts: freeTargetLimit,
        isActive: true,
      },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        maxActivePosts: freeTargetLimit,
      },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: {
        maxActivePosts: proTargetLimit,
        isActive: true,
      },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        billingInterval: "MONTHLY",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
        maxActivePosts: proTargetLimit,
      },
    });

    const freeCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Free Company ${suffix}`,
        registrationNumber: `FREE-LIMIT-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const proCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Pro Company ${suffix}`,
        registrationNumber: `PRO-LIMIT-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
        currentPlanId: proPlan.id,
        subscriptionStatus: "ACTIVE",
      },
    });

    const freeAdmin = await prisma.user.create({
      data: {
        companyId: freeCompany.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Free",
        lastName: "Admin",
        email: `free-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const proAdmin = await prisma.user.create({
      data: {
        companyId: proCompany.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Pro",
        lastName: "Admin",
        email: `pro-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const origin = await prisma.location.create({
      data: {
        countryCode: "RS",
        city: "Belgrade",
      },
    });

    const destination = await prisma.location.create({
      data: {
        countryCode: "MK",
        city: "Skopje",
      },
    });

    const route = await prisma.route.create({
      data: {
        originLocationId: origin.id,
        destinationLocationId: destination.id,
      },
    });

    const freeToken = authHeader(signAccessToken, {
      userId: freeAdmin.id,
      role: freeAdmin.role,
      companyId: freeCompany.id,
      email: freeAdmin.email,
    });

    const proToken = authHeader(signAccessToken, {
      userId: proAdmin.id,
      role: proAdmin.role,
      companyId: proCompany.id,
      email: proAdmin.email,
    });

    try {
      for (let i = 0; i < freeTargetLimit; i += 1) {
        await prisma.post.create({
          data: {
            companyId: freeCompany.id,
            createdByUserId: freeAdmin.id,
            routeId: route.id,
            priceType: PostPriceType.FIXED,
            priceAmount: 1000 + i,
            currency: "EUR",
            title: `Free existing ${i + 1}`,
          },
        });
      }

      const freeBlockedResponse = await request(app)
        .post("/api/v1/posts")
        .set("Authorization", freeToken)
        .send({
          routeId: route.id,
          priceType: "FIXED",
          priceAmount: 1500,
          currency: "EUR",
          title: "Blocked by active post limit",
        });

      expect(freeBlockedResponse.statusCode).toBe(403);
      expect(freeBlockedResponse.body.error.code).toBe("USAGE_LIMIT_REACHED");
      expect(freeBlockedResponse.body.error.details.metric).toBe("ACTIVE_POSTS");
      expect(freeBlockedResponse.body.error.details.limit).toBe(freeTargetLimit);

      const proSeedCount = Math.max(0, proTargetLimit - 1);
      for (let i = 0; i < proSeedCount; i += 1) {
        await prisma.post.create({
          data: {
            companyId: proCompany.id,
            createdByUserId: proAdmin.id,
            routeId: route.id,
            priceType: PostPriceType.FIXED,
            priceAmount: 2000 + i,
            currency: "EUR",
            title: `Pro existing ${i + 1}`,
          },
        });
      }

      const proAllowedResponse = await request(app)
        .post("/api/v1/posts")
        .set("Authorization", proToken)
        .send({
          routeId: route.id,
          priceType: "FIXED",
          priceAmount: 2500,
          currency: "EUR",
          title: "Allowed under pro plan",
        });

      expect(proAllowedResponse.statusCode).toBe(201);
      expect(proAllowedResponse.body.data.companyId).toBe(proCompany.id);
    } finally {
      await prisma.post.deleteMany({ where: { companyId: { in: [freeCompany.id, proCompany.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [freeAdmin.id, proAdmin.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [freeCompany.id, proCompany.id] } } });
      await prisma.route.deleteMany({ where: { id: route.id } });
      await prisma.location.deleteMany({ where: { id: { in: [origin.id, destination.id] } } });

      if (existingFree) {
        await prisma.plan.update({
          where: { id: existingFree.id },
          data: { maxActivePosts: existingFree.maxActivePosts, isActive: existingFree.isActive },
        });
      }

      if (existingPro) {
        await prisma.plan.update({
          where: { id: existingPro.id },
          data: { maxActivePosts: existingPro.maxActivePosts, isActive: existingPro.isActive },
        });
      }
    }
  }, 25_000);

  it("boosts open posts with company credits and records the spend", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-boost`;

    const ownerCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Boost Owner Co ${suffix}`,
        registrationNumber: `BOOST-OWNER-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
      },
    });

    const otherCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Boost Other Co ${suffix}`,
        registrationNumber: `BOOST-OTHER-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const ownerAdmin = await prisma.user.create({
      data: {
        companyId: ownerCompany.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Boost",
        lastName: "Owner",
        email: `boost-owner-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const ownerDriver = await prisma.user.create({
      data: {
        companyId: ownerCompany.id,
        role: UserRole.COMPANY_DRIVER,
        firstName: "Boost",
        lastName: "Driver",
        email: `boost-owner-driver-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const otherAdmin = await prisma.user.create({
      data: {
        companyId: otherCompany.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Boost",
        lastName: "Other",
        email: `boost-other-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const origin = await prisma.location.create({ data: { countryCode: "RS", city: "Belgrade" } });
    const destination = await prisma.location.create({ data: { countryCode: "MK", city: "Skopje" } });
    const route = await prisma.route.create({
      data: {
        originLocationId: origin.id,
        destinationLocationId: destination.id,
      },
    });

    const post = await prisma.post.create({
      data: {
        companyId: ownerCompany.id,
        createdByUserId: ownerAdmin.id,
        routeId: route.id,
        priceType: PostPriceType.FIXED,
        priceAmount: 1200,
        currency: "EUR",
        title: `Boost target ${suffix}`,
      },
    });

    await prisma.companyCreditWallet.create({
      data: {
        balanceCredits: 5,
        companyId: ownerCompany.id,
      },
    });

    const ownerToken = authHeader(signAccessToken, {
      userId: ownerAdmin.id,
      role: ownerAdmin.role,
      companyId: ownerCompany.id,
      email: ownerAdmin.email,
    });

    const driverToken = authHeader(signAccessToken, {
      userId: ownerDriver.id,
      role: ownerDriver.role,
      companyId: ownerCompany.id,
      email: ownerDriver.email,
    });

    const otherToken = authHeader(signAccessToken, {
      userId: otherAdmin.id,
      role: otherAdmin.role,
      companyId: otherCompany.id,
      email: otherAdmin.email,
    });

    try {
      const driverResponse = await request(app)
        .post(`/api/v1/posts/${post.id}/boost`)
        .set("Authorization", driverToken)
        .send({});
      expect(driverResponse.statusCode).toBe(403);

      const otherCompanyResponse = await request(app)
        .post(`/api/v1/posts/${post.id}/boost`)
        .set("Authorization", otherToken)
        .send({});
      expect(otherCompanyResponse.statusCode).toBe(403);

      const boostResponse = await request(app)
        .post(`/api/v1/posts/${post.id}/boost`)
        .set("Authorization", ownerToken)
        .send({});
      expect(boostResponse.statusCode).toBe(200);
      expect(boostResponse.body.data.isPromoted).toBe(true);
      expect(boostResponse.body.data.promotedUntil).toBeTruthy();
      expect(boostResponse.body.data.billing.mode).toBe("CREDITS");
      expect(boostResponse.body.data.billing.creditCost).toBe(2);
      expect(boostResponse.body.data.billing.walletBalanceCredits).toBe(3);

      const transaction = await prisma.companyCreditTransaction.findFirst({
        where: {
          companyId: ownerCompany.id,
          reasonCode: "TRANSPORT_POST_BOOST",
          referenceId: post.id,
          referenceType: "POST",
        },
      });
      expect(transaction?.amountCredits).toBe(-2);

      const normalPost = await prisma.post.create({
        data: {
          companyId: ownerCompany.id,
          createdByUserId: ownerAdmin.id,
          routeId: route.id,
          priceType: PostPriceType.FIXED,
          priceAmount: 1400,
          currency: "EUR",
          title: `Normal marketplace target ${suffix}`,
        },
      });

      const marketplaceResponse = await request(app)
        .get("/api/v1/posts")
        .set("Authorization", otherToken)
        .query({ scope: "marketplace" });
      expect(marketplaceResponse.statusCode).toBe(200);
      const marketplaceIds = (marketplaceResponse.body.data as Array<{ id: string }>).map((item) => item.id);
      expect(marketplaceIds.indexOf(post.id)).toBeGreaterThanOrEqual(0);
      expect(marketplaceIds.indexOf(normalPost.id)).toBeGreaterThanOrEqual(0);
      expect(marketplaceIds.indexOf(post.id)).toBeLessThan(marketplaceIds.indexOf(normalPost.id));
    } finally {
      await prisma.companyCreditTransaction.deleteMany({ where: { companyId: { in: [ownerCompany.id, otherCompany.id] } } });
      await prisma.companyCreditWallet.deleteMany({ where: { companyId: { in: [ownerCompany.id, otherCompany.id] } } });
      await prisma.usageCounter.deleteMany({ where: { companyId: { in: [ownerCompany.id, otherCompany.id] } } });
      await prisma.post.deleteMany({ where: { companyId: { in: [ownerCompany.id, otherCompany.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerAdmin.id, ownerDriver.id, otherAdmin.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [ownerCompany.id, otherCompany.id] } } });
      await prisma.route.deleteMany({ where: { id: route.id } });
      await prisma.location.deleteMany({ where: { id: { in: [origin.id, destination.id] } } });
    }
  }, 25_000);
});
