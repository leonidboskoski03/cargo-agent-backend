import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, ContractStatus, DocumentKind, NotificationType, PostPriceType, ReviewStatus, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("support closeout endpoints", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  }, 20_000);

  it("covers notifications, documents, audit logs, and review lifecycle with role and tenant scope", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = `${Date.now()}-support`;

    const shipper = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Support Shipper ${suffix}`,
        registrationNumber: `SUP-S-${suffix}`,
        countryCode: "DE",
        city: "Berlin",
      },
    });
    const carrier = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Support Carrier ${suffix}`,
        registrationNumber: `SUP-C-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
      },
    });
    const outsider = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Support Outsider ${suffix}`,
        registrationNumber: `SUP-O-${suffix}`,
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
        email: `support-shipper-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });
    const shipperDriver = await prisma.user.create({
      data: {
        companyId: shipper.id,
        role: UserRole.COMPANY_DRIVER,
        firstName: "Ship",
        lastName: "Driver",
        email: `support-shipper-driver-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });
    const carrierAdmin = await prisma.user.create({
      data: {
        companyId: carrier.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Carrier",
        lastName: "Admin",
        email: `support-carrier-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });
    const outsiderAdmin = await prisma.user.create({
      data: {
        companyId: outsider.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Out",
        lastName: "Admin",
        email: `support-outsider-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const shipperAuth = authHeader(signAccessToken, {
      userId: shipperAdmin.id,
      role: shipperAdmin.role,
      companyId: shipper.id,
      email: shipperAdmin.email,
    });
    const driverAuth = authHeader(signAccessToken, {
      userId: shipperDriver.id,
      role: shipperDriver.role,
      companyId: shipper.id,
      email: shipperDriver.email,
    });
    const carrierAuth = authHeader(signAccessToken, {
      userId: carrierAdmin.id,
      role: carrierAdmin.role,
      companyId: carrier.id,
      email: carrierAdmin.email,
    });
    const outsiderAuth = authHeader(signAccessToken, {
      userId: outsiderAdmin.id,
      role: outsiderAdmin.role,
      companyId: outsider.id,
      email: outsiderAdmin.email,
    });

    let documentId = "";
    let uploadedDocumentId = "";
    let reviewId = "";
    let contractId = "";
    let routeId = "";
    let originId = "";
    let destinationId = "";
    let postId = "";
    let bidId = "";

    try {
      const unreadNotification = await prisma.notification.create({
        data: {
          recipientCompanyId: shipper.id,
          type: NotificationType.CONTRACT_CREATED,
          title: "Contract created",
          body: "A contract was created",
        },
      });
      await prisma.notification.create({
        data: {
          recipientCompanyId: shipper.id,
          type: NotificationType.BID_ACCEPTED,
          title: "Read notification",
          body: "Already read",
          readAt: new Date(),
        },
      });

      const unreadList = await request(app)
        .get("/api/v1/notifications")
        .query({ unreadOnly: true, pageSize: 10 })
        .set("Authorization", driverAuth);
      expect(unreadList.statusCode).toBe(200);
      expect((unreadList.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(unreadNotification.id);

      const markRead = await request(app)
        .patch(`/api/v1/notifications/${unreadNotification.id}/read`)
        .set("Authorization", driverAuth)
        .send({});
      expect(markRead.statusCode).toBe(200);
      expect(markRead.body.data.readAt).toBeTruthy();

      const markAllRead = await request(app).patch("/api/v1/notifications/read-all").set("Authorization", driverAuth).send({});
      expect(markAllRead.statusCode).toBe(200);
      expect(markAllRead.body.data.count).toBeGreaterThanOrEqual(0);

      const createDocument = await request(app).post("/api/v1/documents").set("Authorization", shipperAuth).send({
        kind: DocumentKind.INSURANCE,
        name: `Insurance ${suffix}`,
        mimeType: "application/pdf",
        url: "https://example.com/insurance.pdf",
        ownerCompanyId: outsider.id,
        ownerUserId: outsiderAdmin.id,
      });
      expect(createDocument.statusCode).toBe(201);
      documentId = createDocument.body.data.id as string;
      expect(createDocument.body.data.ownerCompanyId).toBe(shipper.id);
      expect(createDocument.body.data.ownerUserId).toBeNull();

      const driverDocuments = await request(app)
        .get("/api/v1/documents")
        .query({ kind: DocumentKind.INSURANCE })
        .set("Authorization", driverAuth);
      expect(driverDocuments.statusCode).toBe(200);
      expect((driverDocuments.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(documentId);

      const uploadDocument = await request(app).post("/api/v1/documents/upload").set("Authorization", shipperAuth).send({
        kind: DocumentKind.VEHICLE_REGISTRATION,
        name: `Registration photo ${suffix}`,
        mimeType: "image/png",
        fileName: "truck-registration.png",
        contentBase64: Buffer.from("fake png bytes").toString("base64"),
        ownerCompanyId: outsider.id,
      });
      expect(uploadDocument.statusCode).toBe(201);
      uploadedDocumentId = uploadDocument.body.data.id as string;
      expect(uploadDocument.body.data.ownerCompanyId).toBe(shipper.id);
      expect(uploadDocument.body.data.url).toContain("/uploads/companies/");
      expect(uploadDocument.body.data.metadataJson.storage.provider).toBe("local");

      const driverCreateDocument = await request(app).post("/api/v1/documents").set("Authorization", driverAuth).send({
        kind: DocumentKind.OTHER,
        name: `Driver doc ${suffix}`,
        mimeType: "text/plain",
        url: "https://example.com/driver.txt",
      });
      expect(driverCreateDocument.statusCode).toBe(403);

      const driverDeleteDocument = await request(app).delete(`/api/v1/documents/${documentId}`).set("Authorization", driverAuth);
      expect(driverDeleteDocument.statusCode).toBe(403);

      const deleteDocument = await request(app).delete(`/api/v1/documents/${documentId}`).set("Authorization", shipperAuth);
      expect(deleteDocument.statusCode).toBe(200);
      const restoreDocument = await request(app).post(`/api/v1/documents/${documentId}/restore`).set("Authorization", shipperAuth).send({});
      expect(restoreDocument.statusCode).toBe(200);

      await prisma.auditLog.create({
        data: {
          companyId: shipper.id,
          actorUserId: shipperAdmin.id,
          action: `SUPPORT_CLOSEOUT_${suffix}`,
          entityType: "Document",
          entityId: documentId,
        },
      });

      const driverAudit = await request(app).get("/api/v1/audit-logs").set("Authorization", driverAuth);
      expect(driverAudit.statusCode).toBe(403);

      const auditList = await request(app)
        .get("/api/v1/audit-logs")
        .query({ actorId: shipperAdmin.id, action: `SUPPORT_CLOSEOUT_${suffix}` })
        .set("Authorization", shipperAuth);
      expect(auditList.statusCode).toBe(200);
      expect((auditList.body.data as Array<{ action: string }>).map((item) => item.action)).toContain(`SUPPORT_CLOSEOUT_${suffix}`);

      const origin = await prisma.location.create({ data: { countryCode: "DE", city: `Berlin ${suffix}` } });
      const destination = await prisma.location.create({ data: { countryCode: "RS", city: `Belgrade ${suffix}` } });
      originId = origin.id;
      destinationId = destination.id;
      const route = await prisma.route.create({ data: { originLocationId: origin.id, destinationLocationId: destination.id } });
      routeId = route.id;
      const post = await prisma.post.create({
        data: {
          companyId: shipper.id,
          createdByUserId: shipperAdmin.id,
          routeId: route.id,
          priceType: PostPriceType.FIXED,
          priceAmount: 1000,
          currency: "EUR",
          title: `Reviewable post ${suffix}`,
        },
      });
      postId = post.id;
      const bid = await prisma.bid.create({
        data: {
          postId: post.id,
          carrierCompanyId: carrier.id,
          createdByUserId: carrierAdmin.id,
          offeredPriceAmount: 900,
          currency: "EUR",
          status: "ACCEPTED",
        },
      });
      bidId = bid.id;
      const contract = await prisma.contract.create({
        data: {
          postId: post.id,
          acceptedBidId: bid.id,
          routeId: route.id,
          shipperCompanyId: shipper.id,
          carrierCompanyId: carrier.id,
          agreedPriceAmount: 900,
          currency: "EUR",
          status: ContractStatus.COMPLETED,
        },
      });
      contractId = contract.id;

      const driverCreateReview = await request(app).post("/api/v1/reviews").set("Authorization", driverAuth).send({
        contractId,
        rating: 5,
      });
      expect(driverCreateReview.statusCode).toBe(403);

      const createReview = await request(app).post("/api/v1/reviews").set("Authorization", shipperAuth).send({
        contractId,
        rating: 4,
        comment: "Good carrier",
        status: ReviewStatus.DRAFT,
      });
      expect(createReview.statusCode).toBe(201);
      reviewId = createReview.body.data.id as string;

      const updateReview = await request(app).patch(`/api/v1/reviews/${reviewId}`).set("Authorization", shipperAuth).send({
        rating: 5,
        comment: "Great carrier",
      });
      expect(updateReview.statusCode).toBe(200);
      expect(updateReview.body.data.rating).toBe(5);

      const carrierDraftList = await request(app).get("/api/v1/reviews").set("Authorization", carrierAuth);
      expect(carrierDraftList.statusCode).toBe(200);
      expect((carrierDraftList.body.data as Array<{ id: string }>).map((item) => item.id)).not.toContain(reviewId);

      const publishReview = await request(app)
        .patch(`/api/v1/reviews/${reviewId}/status`)
        .set("Authorization", shipperAuth)
        .send({ status: ReviewStatus.PUBLISHED });
      expect(publishReview.statusCode).toBe(200);
      expect(publishReview.body.data.status).toBe(ReviewStatus.PUBLISHED);

      const carrierPublishedList = await request(app).get("/api/v1/reviews").set("Authorization", carrierAuth);
      expect(carrierPublishedList.statusCode).toBe(200);
      expect((carrierPublishedList.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(reviewId);

      const outsiderGetReview = await request(app).get(`/api/v1/reviews/${reviewId}`).set("Authorization", outsiderAuth);
      expect(outsiderGetReview.statusCode).toBe(403);

      const deleteReview = await request(app).delete(`/api/v1/reviews/${reviewId}`).set("Authorization", shipperAuth);
      expect(deleteReview.statusCode).toBe(200);
      const restoreReview = await request(app).post(`/api/v1/reviews/${reviewId}/restore`).set("Authorization", shipperAuth).send({});
      expect(restoreReview.statusCode).toBe(200);
    } finally {
      if (reviewId) await prisma.review.deleteMany({ where: { id: reviewId } });
      if (contractId) await prisma.contract.deleteMany({ where: { id: contractId } });
      if (bidId) await prisma.bid.deleteMany({ where: { id: bidId } });
      if (postId) await prisma.post.deleteMany({ where: { id: postId } });
      if (routeId) await prisma.route.deleteMany({ where: { id: routeId } });
      await prisma.location.deleteMany({ where: { id: { in: [originId, destinationId].filter(Boolean) } } });
      if (documentId) await prisma.document.deleteMany({ where: { id: documentId } });
      if (uploadedDocumentId) await prisma.document.deleteMany({ where: { id: uploadedDocumentId } });
      await prisma.auditLog.deleteMany({ where: { companyId: { in: [shipper.id, carrier.id, outsider.id] } } });
      await prisma.notification.deleteMany({ where: { recipientCompanyId: { in: [shipper.id, carrier.id, outsider.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [shipperAdmin.id, shipperDriver.id, carrierAdmin.id, outsiderAdmin.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [shipper.id, carrier.id, outsider.id] } } });
    }
  }, 35_000);
});
