import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("marketplace scenario", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("runs post -> bid -> contract -> review lifecycle", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const shipper = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Shipper ${suffix}`,
        registrationNumber: `SHIP-${suffix}`,
        countryCode: "DE",
        city: "Berlin",
      },
    });

    const carrier = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Carrier ${suffix}`,
        registrationNumber: `CARR-${suffix}`,
        countryCode: "PL",
        city: "Warsaw",
      },
    });

    const shipperAdmin = await prisma.user.create({
      data: {
        companyId: shipper.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Ship",
        lastName: "Admin",
        email: `ship-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const carrierAdmin = await prisma.user.create({
      data: {
        companyId: carrier.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Car",
        lastName: "Admin",
        email: `carrier-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const shipperAuth = authHeader(signAccessToken, {
      userId: shipperAdmin.id,
      role: shipperAdmin.role,
      companyId: shipper.id,
      email: shipperAdmin.email,
    });

    const carrierAuth = authHeader(signAccessToken, {
      userId: carrierAdmin.id,
      role: carrierAdmin.role,
      companyId: carrier.id,
      email: carrierAdmin.email,
    });

    const origin = await prisma.location.create({
      data: {
        countryCode: "DE",
        city: "Berlin",
      },
    });

    const destination = await prisma.location.create({
      data: {
        countryCode: "PL",
        city: "Warsaw",
      },
    });

    const route = await prisma.route.create({
      data: {
        originLocationId: origin.id,
        destinationLocationId: destination.id,
      },
    });

    try {
      const postResponse = await request(app)
        .post("/api/v1/posts")
        .set("Authorization", shipperAuth)
        .send({
          routeId: route.id,
          priceType: "FIXED",
          priceAmount: 1400,
          currency: "EUR",
          title: "Need carrier",
        });
      expect(postResponse.statusCode).toBe(201);
      const postId = postResponse.body.data.id as string;

      const bidResponse = await request(app)
        .post("/api/v1/bids")
        .set("Authorization", carrierAuth)
        .send({
          postId,
          offeredPriceAmount: 1200,
          currency: "EUR",
          message: "Can do it",
        });
      expect(bidResponse.statusCode).toBe(201);
      const bidId = bidResponse.body.data.id as string;

      const acceptBidResponse = await request(app)
        .patch(`/api/v1/bids/${bidId}/status`)
        .set("Authorization", shipperAuth)
        .send({ status: "ACCEPTED" });
      expect(acceptBidResponse.statusCode).toBe(200);

      const contractResponse = await request(app)
        .post("/api/v1/contracts")
        .set("Authorization", shipperAuth)
        .send({ postId, acceptedBidId: bidId });
      expect(contractResponse.statusCode).toBe(201);
      const contractId = contractResponse.body.data.id as string;

      const inProgressResponse = await request(app)
        .patch(`/api/v1/contracts/${contractId}/status`)
        .set("Authorization", shipperAuth)
        .send({ status: "IN_PROGRESS" });
      expect(inProgressResponse.statusCode).toBe(200);

      const completedResponse = await request(app)
        .patch(`/api/v1/contracts/${contractId}/status`)
        .set("Authorization", shipperAuth)
        .send({ status: "COMPLETED" });
      expect(completedResponse.statusCode).toBe(200);

      const reviewCreateResponse = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", shipperAuth)
        .send({ contractId, rating: 5, comment: "Great carrier" });
      expect(reviewCreateResponse.statusCode).toBe(201);
      const reviewId = reviewCreateResponse.body.data.id as string;

      const reviewPublishResponse = await request(app)
        .patch(`/api/v1/reviews/${reviewId}/status`)
        .set("Authorization", shipperAuth)
        .send({ status: "PUBLISHED" });
      expect(reviewPublishResponse.statusCode).toBe(200);

      const auditLogsResponse = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", shipperAuth);
      expect(auditLogsResponse.statusCode).toBe(200);
      expect(Array.isArray(auditLogsResponse.body.data)).toBe(true);
    } finally {
      await prisma.review.deleteMany({ where: { OR: [{ reviewerCompanyId: shipper.id }, { targetCompanyId: carrier.id }] } });
      await prisma.contract.deleteMany({ where: { OR: [{ shipperCompanyId: shipper.id }, { carrierCompanyId: carrier.id }] } });
      await prisma.bid.deleteMany({ where: { OR: [{ carrierCompanyId: carrier.id }, { post: { companyId: shipper.id } }] } });
      await prisma.post.deleteMany({ where: { companyId: shipper.id } });
      await prisma.route.deleteMany({ where: { id: route.id } });
      await prisma.location.deleteMany({ where: { id: { in: [origin.id, destination.id] } } });
      await prisma.auditLog.deleteMany({ where: { companyId: { in: [shipper.id, carrier.id] } } });
      await prisma.notification.deleteMany({ where: { recipientCompanyId: { in: [shipper.id, carrier.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [shipperAdmin.id, carrierAdmin.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [shipper.id, carrier.id] } } });
    }
  }, 25_000);
});


