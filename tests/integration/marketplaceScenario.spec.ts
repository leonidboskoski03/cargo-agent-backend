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
        companyId: shipper.id,
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

      const carrierMarketplaceList = await request(app)
        .get("/api/v1/posts")
        .set("Authorization", carrierAuth)
        .query({ scope: "marketplace" });
      expect(carrierMarketplaceList.statusCode).toBe(200);
      expect((carrierMarketplaceList.body.data as Array<{ id: string }>).map((post) => post.id)).toContain(postId);

      const carrierDetail = await request(app)
        .get(`/api/v1/posts/${postId}`)
        .set("Authorization", carrierAuth);
      expect(carrierDetail.statusCode).toBe(200);
      expect(carrierDetail.body.data.id).toBe(postId);
      expect(carrierDetail.body.data.route.originLocation.city).toBe("Berlin");
      expect(carrierDetail.body.data.route.destinationLocation.city).toBe("Warsaw");
      expect(carrierDetail.body.data.company.name).toBe(shipper.name);

      const carrierCannotEdit = await request(app)
        .patch(`/api/v1/posts/${postId}`)
        .set("Authorization", carrierAuth)
        .send({ title: "Nope" });
      expect(carrierCannotEdit.statusCode).toBe(403);

      const shipperMineList = await request(app)
        .get("/api/v1/posts")
        .set("Authorization", shipperAuth)
        .query({ scope: "mine" });
      expect(shipperMineList.statusCode).toBe(200);
      expect((shipperMineList.body.data as Array<{ id: string }>).map((post) => post.id)).toContain(postId);

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

      const createdActivitiesResponse = await request(app)
        .get(`/api/v1/bids/${bidId}/activities`)
        .set("Authorization", carrierAuth);
      expect(createdActivitiesResponse.statusCode).toBe(200);
      expect((createdActivitiesResponse.body.data as Array<{ type: string }>).map((activity) => activity.type)).toContain("CREATED");

      const acceptBidResponse = await request(app)
        .patch(`/api/v1/bids/${bidId}/status`)
        .set("Authorization", shipperAuth)
        .send({ status: "ACCEPTED" });
      expect(acceptBidResponse.statusCode).toBe(200);
      expect(acceptBidResponse.body.data.contract.id).toBeTruthy();
      expect(acceptBidResponse.body.data.contract.status).toBe("CONFIRMED");
      const contractId = acceptBidResponse.body.data.contract.id as string;

      const carrierMarketplaceAfterAssign = await request(app)
        .get("/api/v1/posts")
        .set("Authorization", carrierAuth)
        .query({ scope: "marketplace", status: "ASSIGNED" });
      expect(carrierMarketplaceAfterAssign.statusCode).toBe(200);
      expect((carrierMarketplaceAfterAssign.body.data as Array<{ id: string }>).map((post) => post.id)).not.toContain(postId);

      const contractResponse = await request(app)
        .post("/api/v1/contracts")
        .set("Authorization", shipperAuth)
        .send({ postId, acceptedBidId: bidId });
      expect(contractResponse.statusCode).toBe(201);
      expect(contractResponse.body.data.id).toBe(contractId);

      const contractCount = await prisma.contract.count({ where: { acceptedBidId: bidId } });
      expect(contractCount).toBe(1);

      const contractActivitiesResponse = await request(app)
        .get(`/api/v1/bids/${bidId}/activities`)
        .set("Authorization", shipperAuth);
      expect(contractActivitiesResponse.statusCode).toBe(200);
      expect((contractActivitiesResponse.body.data as Array<{ type: string }>).map((activity) => activity.type)).toEqual(
        expect.arrayContaining(["ACCEPTED", "CONTRACT_CREATED", "CREATED"]),
      );

      const invalidActualTimelineResponse = await request(app)
        .patch(`/api/v1/contracts/${contractId}/timeline`)
        .set("Authorization", shipperAuth)
        .send({ pickupActualAt: "2026-06-09T10:00:00.000Z" });
      expect(invalidActualTimelineResponse.statusCode).toBe(409);
      expect(invalidActualTimelineResponse.body.error.code).toBe("CONTRACT_NOT_STARTED");

      const plannedTimelineResponse = await request(app)
        .patch(`/api/v1/contracts/${contractId}/timeline`)
        .set("Authorization", shipperAuth)
        .send({
          pickupPlannedAt: "2026-06-09T08:00:00.000Z",
          deliveryPlannedAt: "2026-06-09T14:00:00.000Z",
        });
      expect(plannedTimelineResponse.statusCode).toBe(200);
      expect(plannedTimelineResponse.body.data.pickupPlannedAt).toBeTruthy();

      const inProgressResponse = await request(app)
        .patch(`/api/v1/contracts/${contractId}/status`)
        .set("Authorization", shipperAuth)
        .send({ status: "IN_PROGRESS" });
      expect(inProgressResponse.statusCode).toBe(200);

      const actualTimelineResponse = await request(app)
        .patch(`/api/v1/contracts/${contractId}/timeline`)
        .set("Authorization", shipperAuth)
        .send({
          pickupActualAt: "2026-06-09T09:00:00.000Z",
          deliveryActualAt: "2026-06-09T15:00:00.000Z",
        });
      expect(actualTimelineResponse.statusCode).toBe(200);
      expect(actualTimelineResponse.body.data.deliveryActualAt).toBeTruthy();

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


