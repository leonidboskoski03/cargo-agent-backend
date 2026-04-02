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

  it("blocks promoted posts on FREE and allows them on PRO", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-promoted`;

    const existingFree = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
    const existingPro = await prisma.plan.findUnique({ where: { code: PlanCode.PRO } });

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: { isActive: true, hasPromotedPosts: false, maxActivePosts: 10 },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        hasPromotedPosts: false,
        maxActivePosts: 10,
      },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: { isActive: true, hasPromotedPosts: true, maxActivePosts: 10 },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        billingInterval: "MONTHLY",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
        hasPromotedPosts: true,
        maxActivePosts: 10,
      },
    });

    const freeCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Free Promoted Co ${suffix}`,
        registrationNumber: `FREE-PROM-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const proCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Pro Promoted Co ${suffix}`,
        registrationNumber: `PRO-PROM-${suffix}`,
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
        lastName: "Promoted",
        email: `free-promoted-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const proAdmin = await prisma.user.create({
      data: {
        companyId: proCompany.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Pro",
        lastName: "Promoted",
        email: `pro-promoted-admin-${suffix}@test.local`,
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
      const freeResponse = await request(app)
        .post("/api/v1/posts")
        .set("Authorization", freeToken)
        .send({
          routeId: route.id,
          priceType: "FIXED",
          priceAmount: 1200,
          currency: "EUR",
          title: "Free promoted blocked",
          isPromoted: true,
        });

      expect(freeResponse.statusCode).toBe(403);
      expect(freeResponse.body.error.code).toBe("PLAN_FEATURE_REQUIRED");
      expect(freeResponse.body.error.details.feature).toBe("PROMOTED_POSTS");

      const proResponse = await request(app)
        .post("/api/v1/posts")
        .set("Authorization", proToken)
        .send({
          routeId: route.id,
          priceType: "FIXED",
          priceAmount: 2200,
          currency: "EUR",
          title: "Pro promoted allowed",
          isPromoted: true,
        });

      expect(proResponse.statusCode).toBe(201);
      expect(proResponse.body.data.isPromoted).toBe(true);
    } finally {
      await prisma.post.deleteMany({ where: { companyId: { in: [freeCompany.id, proCompany.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [freeAdmin.id, proAdmin.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [freeCompany.id, proCompany.id] } } });
      await prisma.route.deleteMany({ where: { id: route.id } });
      await prisma.location.deleteMany({ where: { id: { in: [origin.id, destination.id] } } });
      await prisma.usageCounter.deleteMany({ where: { companyId: { in: [freeCompany.id, proCompany.id] } } });

      if (existingFree) {
        await prisma.plan.update({
          where: { id: existingFree.id },
          data: {
            hasPromotedPosts: existingFree.hasPromotedPosts,
            maxActivePosts: existingFree.maxActivePosts,
            isActive: existingFree.isActive,
          },
        });
      }

      if (existingPro) {
        await prisma.plan.update({
          where: { id: existingPro.id },
          data: {
            hasPromotedPosts: existingPro.hasPromotedPosts,
            maxActivePosts: existingPro.maxActivePosts,
            isActive: existingPro.isActive,
          },
        });
      }
    }
  }, 25_000);
});
