import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, PlanCode, PostPriceType, UsageMetric, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";
import { getCurrentMonthPeriodStartUtc } from "../../src/shared/billing/usageMetrics.js";

describe("bid usage limits", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("blocks FREE carriers at monthly bid limit and allows PRO under higher limit", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const existingFree = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
    const existingPro = await prisma.plan.findUnique({ where: { code: PlanCode.PRO } });

    const freeTargetLimit = existingFree?.maxBidsPerMonth && existingFree.maxBidsPerMonth > 0 ? existingFree.maxBidsPerMonth : 1;
    const proTargetLimit =
      existingPro?.maxBidsPerMonth && existingPro.maxBidsPerMonth > freeTargetLimit
        ? existingPro.maxBidsPerMonth
        : freeTargetLimit + 3;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: {
        maxBidsPerMonth: freeTargetLimit,
        isActive: true,
      },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        maxBidsPerMonth: freeTargetLimit,
      },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: {
        maxBidsPerMonth: proTargetLimit,
        isActive: true,
      },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        billingInterval: "MONTHLY",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
        maxBidsPerMonth: proTargetLimit,
      },
    });

    const shipper = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Shipper ${suffix}`,
        registrationNumber: `SHIP-BID-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
      },
    });

    const freeCarrier = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Free Carrier ${suffix}`,
        registrationNumber: `FREE-CARR-${suffix}`,
        countryCode: "RS",
        city: "Nis",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const proCarrier = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Pro Carrier ${suffix}`,
        registrationNumber: `PRO-CARR-${suffix}`,
        countryCode: "RS",
        city: "Novi Sad",
        currentPlanId: proPlan.id,
        subscriptionStatus: "ACTIVE",
      },
    });

    const shipperAdmin = await prisma.user.create({
      data: {
        companyId: shipper.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Ship",
        lastName: "Admin",
        email: `ship-admin-bid-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const freeCarrierAdmin = await prisma.user.create({
      data: {
        companyId: freeCarrier.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Free",
        lastName: "Carrier",
        email: `free-carrier-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const proCarrierAdmin = await prisma.user.create({
      data: {
        companyId: proCarrier.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Pro",
        lastName: "Carrier",
        email: `pro-carrier-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const origin = await prisma.location.create({
      data: { countryCode: "RS", city: "Belgrade" },
    });

    const destination = await prisma.location.create({
      data: { countryCode: "MK", city: "Skopje" },
    });

    const route = await prisma.route.create({
      data: {
        originLocationId: origin.id,
        destinationLocationId: destination.id,
      },
    });

    const requiredPostCount = Math.max(freeTargetLimit + 1, proTargetLimit);
    const posts = [] as Array<{ id: string }>;

    for (let i = 0; i < requiredPostCount; i += 1) {
      const post = await prisma.post.create({
        data: {
          companyId: shipper.id,
          createdByUserId: shipperAdmin.id,
          routeId: route.id,
          priceType: PostPriceType.FIXED,
          priceAmount: 1500 + i,
          currency: "EUR",
          title: `Bid target ${i + 1}`,
        },
        select: { id: true },
      });

      posts.push(post);
    }

    const freeToken = authHeader(signAccessToken, {
      userId: freeCarrierAdmin.id,
      role: freeCarrierAdmin.role,
      companyId: freeCarrier.id,
      email: freeCarrierAdmin.email,
    });

    const proToken = authHeader(signAccessToken, {
      userId: proCarrierAdmin.id,
      role: proCarrierAdmin.role,
      companyId: proCarrier.id,
      email: proCarrierAdmin.email,
    });

    try {
      for (let i = 0; i < freeTargetLimit; i += 1) {
        await prisma.bid.create({
          data: {
            postId: posts[i].id,
            carrierCompanyId: freeCarrier.id,
            createdByUserId: freeCarrierAdmin.id,
            offeredPriceAmount: 1200 + i,
            currency: "EUR",
          },
        });
      }

      const freeBlockedResponse = await request(app)
        .post("/api/v1/bids")
        .set("Authorization", freeToken)
        .send({
          postId: posts[freeTargetLimit].id,
          offeredPriceAmount: 1300,
          currency: "EUR",
          message: "Blocked by monthly limit",
        });

      expect(freeBlockedResponse.statusCode).toBe(403);
      expect(freeBlockedResponse.body.error.code).toBe("USAGE_LIMIT_REACHED");
      expect(freeBlockedResponse.body.error.details.metric).toBe("BIDS_PER_MONTH");
      expect(freeBlockedResponse.body.error.details.limit).toBe(freeTargetLimit);

      const proSeedCount = Math.max(0, proTargetLimit - 1);
      for (let i = 0; i < proSeedCount; i += 1) {
        await prisma.bid.create({
          data: {
            postId: posts[i].id,
            carrierCompanyId: proCarrier.id,
            createdByUserId: proCarrierAdmin.id,
            offeredPriceAmount: 1400 + i,
            currency: "EUR",
          },
        });
      }

      const proAllowedResponse = await request(app)
        .post("/api/v1/bids")
        .set("Authorization", proToken)
        .send({
          postId: posts[proSeedCount].id,
          offeredPriceAmount: 1500,
          currency: "EUR",
          message: "Allowed under pro limit",
        });

      expect(proAllowedResponse.statusCode).toBe(201);
      expect(proAllowedResponse.body.data.carrierCompanyId).toBe(proCarrier.id);
    } finally {
      await prisma.bid.deleteMany({ where: { carrierCompanyId: { in: [freeCarrier.id, proCarrier.id] } } });
      await prisma.post.deleteMany({ where: { companyId: shipper.id } });
      await prisma.user.deleteMany({ where: { id: { in: [shipperAdmin.id, freeCarrierAdmin.id, proCarrierAdmin.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [shipper.id, freeCarrier.id, proCarrier.id] } } });
      await prisma.route.deleteMany({ where: { id: route.id } });
      await prisma.location.deleteMany({ where: { id: { in: [origin.id, destination.id] } } });

      if (existingFree) {
        await prisma.plan.update({
          where: { id: existingFree.id },
          data: { maxBidsPerMonth: existingFree.maxBidsPerMonth, isActive: existingFree.isActive },
        });
      }

      if (existingPro) {
        await prisma.plan.update({
          where: { id: existingPro.id },
          data: { maxBidsPerMonth: existingPro.maxBidsPerMonth, isActive: existingPro.isActive },
        });
      }
    }
  }, 25_000);

  it("allows only one concurrent bid when monthly limit is 1", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-race`;

    const existingFree = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: {
        maxBidsPerMonth: 1,
        isActive: true,
      },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        maxBidsPerMonth: 1,
      },
    });

    const shipper = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Race Shipper ${suffix}`,
        registrationNumber: `RACE-SHIP-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
      },
    });

    const carrier = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Race Carrier ${suffix}`,
        registrationNumber: `RACE-CARR-${suffix}`,
        countryCode: "RS",
        city: "Nis",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const shipperAdmin = await prisma.user.create({
      data: {
        companyId: shipper.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Ship",
        lastName: "Race",
        email: `race-ship-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const carrierAdmin = await prisma.user.create({
      data: {
        companyId: carrier.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Carrier",
        lastName: "Race",
        email: `race-carrier-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const origin = await prisma.location.create({ data: { countryCode: "RS", city: "Belgrade" } });
    const destination = await prisma.location.create({ data: { countryCode: "AL", city: "Tirana" } });

    const route = await prisma.route.create({
      data: {
        originLocationId: origin.id,
        destinationLocationId: destination.id,
      },
    });

    const [postOne, postTwo] = await Promise.all([
      prisma.post.create({
        data: {
          companyId: shipper.id,
          createdByUserId: shipperAdmin.id,
          routeId: route.id,
          priceType: PostPriceType.FIXED,
          priceAmount: 1000,
          currency: "EUR",
          title: "Race target 1",
        },
        select: { id: true },
      }),
      prisma.post.create({
        data: {
          companyId: shipper.id,
          createdByUserId: shipperAdmin.id,
          routeId: route.id,
          priceType: PostPriceType.FIXED,
          priceAmount: 1100,
          currency: "EUR",
          title: "Race target 2",
        },
        select: { id: true },
      }),
    ]);

    const carrierToken = authHeader(signAccessToken, {
      userId: carrierAdmin.id,
      role: carrierAdmin.role,
      companyId: carrier.id,
      email: carrierAdmin.email,
    });

    try {
      const [first, second] = await Promise.all([
        request(app)
          .post("/api/v1/bids")
          .set("Authorization", carrierToken)
          .send({ postId: postOne.id, offeredPriceAmount: 900, currency: "EUR", message: "Race #1" }),
        request(app)
          .post("/api/v1/bids")
          .set("Authorization", carrierToken)
          .send({ postId: postTwo.id, offeredPriceAmount: 950, currency: "EUR", message: "Race #2" }),
      ]);

      const statuses = [first.statusCode, second.statusCode].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 403]);

      const rejected = first.statusCode === 403 ? first : second;
      expect(rejected.body.error.code).toBe("USAGE_LIMIT_REACHED");
      expect(rejected.body.error.details.metric).toBe("BIDS_PER_MONTH");

      const bidCount = await prisma.bid.count({
        where: {
          carrierCompanyId: carrier.id,
          deletedAt: null,
        },
      });
      expect(bidCount).toBe(1);

      const counter = await prisma.usageCounter.findUnique({
        where: {
          companyId_metric_periodStart: {
            companyId: carrier.id,
            metric: UsageMetric.BIDS_PER_MONTH,
            periodStart: getCurrentMonthPeriodStartUtc(),
          },
        },
        select: { used: true },
      });
      expect(counter?.used).toBe(1);
    } finally {
      await prisma.usageCounter.deleteMany({ where: { companyId: carrier.id } });
      await prisma.bid.deleteMany({ where: { carrierCompanyId: carrier.id } });
      await prisma.post.deleteMany({ where: { companyId: shipper.id } });
      await prisma.user.deleteMany({ where: { id: { in: [shipperAdmin.id, carrierAdmin.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [shipper.id, carrier.id] } } });
      await prisma.route.deleteMany({ where: { id: route.id } });
      await prisma.location.deleteMany({ where: { id: { in: [origin.id, destination.id] } } });

      if (existingFree) {
        await prisma.plan.update({
          where: { id: existingFree.id },
          data: { maxBidsPerMonth: existingFree.maxBidsPerMonth, isActive: existingFree.isActive },
        });
      }
    }
  }, 25_000);
});

