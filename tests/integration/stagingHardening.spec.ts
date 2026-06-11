import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { BidStatus, CompanyType, OtpChannel, OtpPurpose, OtpStatus, PostPriceType, PostStatus, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("staging hardening jobs and readiness", () => {
  afterAll(async () => {
    await rm(".tmp/test-uploads", { force: true, recursive: true });
  });

  it("expires stale auth state, marketplace state, and checkout sessions", async () => {
    const { prisma } = await initRuntime();
    if (!(await isDatabaseAvailable(prisma))) return;

    const { cleanupAuthStateJob } = await import("../../src/jobs/maintenance/authCleanup.job.js");
    const { cleanupMarketplaceStateJob } = await import("../../src/jobs/maintenance/marketplaceCleanup.job.js");
    const { cleanupStaleCheckoutSessionsJob } = await import("../../src/jobs/billing/cleanupStaleCheckout.job.js");

    const suffix = `${Date.now()}-staging-jobs`;
    const past = new Date(Date.now() - 60_000);
    const company = await prisma.company.create({
      data: {
        city: "Skopje",
        companyType: CompanyType.SHIPPER,
        countryCode: "MK",
        name: `Staging Jobs ${suffix}`,
        registrationNumber: `STAGE-JOBS-${suffix}`,
      },
    });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `staging-jobs-${suffix}@test.local`,
        firstName: "Stage",
        lastName: "Jobs",
        passwordHash: "hash",
        role: UserRole.COMPANY_ADMIN,
      },
    });
    const origin = await prisma.location.create({ data: { city: "Skopje", countryCode: "MK" } });
    const destination = await prisma.location.create({ data: { city: "Prilep", countryCode: "MK" } });
    const route = await prisma.route.create({
      data: {
        companyId: company.id,
        originLocationId: origin.id,
        destinationLocationId: destination.id,
      },
    });
    const post = await prisma.post.create({
      data: {
        companyId: company.id,
        createdByUserId: user.id,
        currency: "EUR",
        expiresAt: past,
        priceType: PostPriceType.REQUEST_QUOTE,
        routeId: route.id,
        status: PostStatus.OPEN,
      },
    });
    const bid = await prisma.bid.create({
      data: {
        carrierCompanyId: company.id,
        createdByUserId: user.id,
        currency: "EUR",
        postId: post.id,
        status: BidStatus.PENDING,
      },
    });
    const checkout = await prisma.checkoutSession.create({
      data: {
        companyId: company.id,
        expiresAt: past,
        planCode: "FREE",
        stripeCheckoutSessionId: `cs_stage_${suffix}`,
      },
    });
    const otp = await prisma.authOtpChallenge.create({
      data: {
        channel: OtpChannel.EMAIL,
        codeHash: "hash",
        destination: user.email,
        expiresAt: past,
        maxAttempts: 5,
        provider: "simulated",
        purpose: OtpPurpose.FORGOT_PASSWORD,
        status: OtpStatus.PENDING,
        userId: user.id,
      },
    });
    const session = await prisma.authSession.create({
      data: {
        expiresAt: past,
        refreshTokenHash: `refresh-${suffix}`,
        tokenVersionSnapshot: 1,
        userId: user.id,
      },
    });

    try {
      const authCleanup = await cleanupAuthStateJob();
      const marketplaceCleanup = await cleanupMarketplaceStateJob();
      const checkoutCleanup = await cleanupStaleCheckoutSessionsJob();

      expect(authCleanup.expiredOtp).toBeGreaterThanOrEqual(1);
      expect(authCleanup.expiredSessions).toBeGreaterThanOrEqual(1);
      expect(marketplaceCleanup.expiredPosts).toBeGreaterThanOrEqual(1);
      expect(marketplaceCleanup.closedBids).toBeGreaterThanOrEqual(1);
      expect(checkoutCleanup.subscriptionCheckouts).toBeGreaterThanOrEqual(1);

      await expect(prisma.authOtpChallenge.findUnique({ where: { id: otp.id } })).resolves.toMatchObject({ status: OtpStatus.EXPIRED });
      await expect(prisma.authSession.findUnique({ where: { id: session.id } })).resolves.toMatchObject({ revokeReason: "SESSION_EXPIRED" });
      await expect(prisma.post.findUnique({ where: { id: post.id } })).resolves.toMatchObject({ status: PostStatus.EXPIRED });
      await expect(prisma.bid.findUnique({ where: { id: bid.id } })).resolves.toMatchObject({ status: BidStatus.REJECTED });
      await expect(prisma.checkoutSession.findUnique({ where: { id: checkout.id } })).resolves.toMatchObject({ status: "EXPIRED" });
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { id: otp.id } });
      await prisma.authSession.deleteMany({ where: { id: session.id } });
      await prisma.checkoutSession.deleteMany({ where: { id: checkout.id } });
      await prisma.bid.deleteMany({ where: { id: bid.id } });
      await prisma.post.deleteMany({ where: { id: post.id } });
      await prisma.route.deleteMany({ where: { id: route.id } });
      await prisma.location.deleteMany({ where: { id: { in: [origin.id, destination.id] } } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 30_000);

  it("uploads local document files and exposes admin delivery readiness status", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!(await isDatabaseAvailable(prisma))) return;

    const app = buildApp();
    const suffix = `${Date.now()}-upload`;
    const company = await prisma.company.create({
      data: {
        city: "Bitola",
        companyType: CompanyType.CARRIER,
        countryCode: "MK",
        name: `Upload Co ${suffix}`,
        registrationNumber: `UPLOAD-${suffix}`,
      },
    });
    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `upload-admin-${suffix}@test.local`,
        firstName: "Upload",
        lastName: "Admin",
        passwordHash: "hash",
        role: UserRole.COMPANY_ADMIN,
      },
    });
    const driver = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `upload-driver-${suffix}@test.local`,
        firstName: "Upload",
        lastName: "Driver",
        passwordHash: "hash",
        role: UserRole.COMPANY_DRIVER,
      },
    });

    const adminToken = authHeader(signAccessToken, { companyId: company.id, email: admin.email, role: admin.role, userId: admin.id });
    const driverToken = authHeader(signAccessToken, { companyId: company.id, email: driver.email, role: driver.role, userId: driver.id });

    try {
      const readiness = await request(app).get("/api/v1/delivery/status").set("Authorization", adminToken);
      expect(readiness.statusCode).toBe(200);
      expect(readiness.body.data.email.configured).toBe(false);
      expect(readiness.body.data.storage.configured).toBe(true);

      const driverReadiness = await request(app).get("/api/v1/delivery/status").set("Authorization", driverToken);
      expect(driverReadiness.statusCode).toBe(403);

      const upload = await request(app)
        .post("/api/v1/documents/upload")
        .set("Authorization", adminToken)
        .send({
          contentBase64: `data:image/png;base64,${Buffer.from("image-bytes").toString("base64")}`,
          fileName: "truck.png",
          kind: "OTHER",
          metadataJson: { purpose: "STAGING_TEST" },
          mimeType: "image/png",
          name: "Truck image",
        });

      expect(upload.statusCode).toBe(201);
      expect(upload.body.data.url).toMatch(/^http:\/\/localhost:4001\/uploads\//);
      expect(upload.body.data.ownerCompanyId).toBe(company.id);

      await prisma.document.deleteMany({ where: { id: upload.body.data.id } });
    } finally {
      await prisma.document.deleteMany({ where: { ownerCompanyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, driver.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 30_000);
});
