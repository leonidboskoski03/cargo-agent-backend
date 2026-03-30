import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, JobSeekerCreditTxType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("release smoke chain", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("covers registration -> marketplace -> webhook idempotency in one chain", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-smoke`;

    const companyEmail = `smoke-company-${suffix}@test.local`;
    const seekerEmail = `smoke-seeker-${suffix}@test.local`;
    const registrationNumber = `SMK-${suffix}`;
    const packCode = `SMK_PACK_${suffix.replace(/[^0-9]/g, "")}`;
    const stripeCheckoutSessionId = `cs_smoke_${suffix}`;

    let companyId: string | null = null;
    let seekerId: string | null = null;

    try {
      // 1) Company registration (FREE)
      const companyStart = await request(app).post("/api/v1/auth/registration/start").send({
        kind: "COMPANY",
        firstName: "Smoke",
        lastName: "CompanyAdmin",
        email: companyEmail,
        password: "StrongPass123!",
      });
      expect(companyStart.statusCode).toBe(200);

      const companyVerify = await request(app).post("/api/v1/auth/registration/verify-otp").send({
        draftId: companyStart.body.data.draftId,
        code: companyStart.body.data.code,
      });
      expect(companyVerify.statusCode).toBe(200);

      const companyComplete = await request(app).post("/api/v1/auth/registration/complete-company").send({
        draftId: companyStart.body.data.draftId,
        companyName: `Smoke Logistics ${suffix}`,
        companyType: CompanyType.CARRIER,
        registrationNumber,
        address: "Main 1",
        countryCode: "MK",
        city: "Skopje",
        planCode: "FREE",
      });
      expect(companyComplete.statusCode).toBe(200);
      expect(companyComplete.body.data.checkout).toBeNull();

      const companyUser = await prisma.user.findUnique({
        where: { email: companyEmail },
        select: { id: true, email: true, role: true, companyId: true },
      });
      expect(companyUser?.companyId).toBeTruthy();
      companyId = companyUser?.companyId ?? null;

      const companyToken = authHeader(signAccessToken, {
        userId: companyUser?.id as string,
        role: companyUser?.role as UserRole,
        companyId: companyUser?.companyId ?? undefined,
        email: companyUser?.email as string,
      });

      // 2) Company creates driver job listing
      const listing = await request(app)
        .post("/api/v1/job-applications")
        .set("Authorization", companyToken)
        .send({
          title: `Smoke driver role ${suffix}`,
          description: "Cross-border regional role",
          preferredCountryCode: "MK",
          preferredCity: "Skopje",
        });
      expect(listing.statusCode).toBe(201);

      // 3) Job seeker registration and apply flow
      const seekerStart = await request(app).post("/api/v1/auth/registration/start").send({
        kind: "JOB_SEEKER",
        firstName: "Smoke",
        lastName: "Seeker",
        email: seekerEmail,
        password: "StrongPass123!",
      });
      expect(seekerStart.statusCode).toBe(200);

      const seekerVerify = await request(app).post("/api/v1/auth/registration/verify-otp").send({
        draftId: seekerStart.body.data.draftId,
        code: seekerStart.body.data.code,
      });
      expect(seekerVerify.statusCode).toBe(200);

      const seekerComplete = await request(app).post("/api/v1/auth/registration/complete-job-seeker").send({
        draftId: seekerStart.body.data.draftId,
        countryCode: "MK",
        city: "Skopje",
        headline: "Owner operator",
        yearsExperience: 4,
      });
      expect(seekerComplete.statusCode).toBe(200);

      const seekerUser = await prisma.user.findUnique({
        where: { email: seekerEmail },
        select: { id: true, email: true, role: true },
      });
      seekerId = seekerUser?.id ?? null;

      const seekerToken = authHeader(signAccessToken, {
        userId: seekerUser?.id as string,
        role: seekerUser?.role as UserRole,
        email: seekerUser?.email as string,
      });

      const apply = await request(app)
        .post(`/api/v1/job-applications/${listing.body.data.id}/apply`)
        .set("Authorization", seekerToken)
        .send({ message: "Interested and available" });
      expect(apply.statusCode).toBe(201);
      expect(["FREE_QUOTA", "CREDITS"]).toContain(apply.body.data.billing.mode);

      // 4) Webhook idempotency for seeker checkout lane
      const creditPack = await prisma.jobSeekerCreditPack.create({
        data: {
          code: packCode,
          name: "Smoke pack",
          credits: 15,
          priceAmount: 4.99,
          currency: "EUR",
        },
        select: { id: true },
      });

      const checkout = await prisma.jobSeekerCheckoutSession.create({
        data: {
          userId: seekerUser?.id as string,
          creditPackId: creditPack.id,
          stripeCheckoutSessionId,
          amountCredits: 15,
          amountPaid: 4.99,
          currency: "EUR",
        },
        select: { id: true },
      });

      const webhookEvent = {
        id: `evt_smoke_${suffix}`,
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: {
            id: stripeCheckoutSessionId,
            object: "checkout.session",
            metadata: {
              lane: "JOB_SEEKER_CREDITS",
              userId: seekerUser?.id,
            },
          },
        },
      };

      const firstWebhook = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(webhookEvent));
      expect(firstWebhook.statusCode).toBe(200);

      const replayWebhook = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(webhookEvent));
      expect(replayWebhook.statusCode).toBe(200);

      const topupTxCount = await prisma.jobSeekerCreditTransaction.count({
        where: {
          userId: seekerUser?.id as string,
          type: JobSeekerCreditTxType.PURCHASE,
          reasonCode: "CHECKOUT_TOPUP",
          referenceId: checkout.id,
        },
      });
      expect(topupTxCount).toBe(1);

      const completedCheckout = await prisma.jobSeekerCheckoutSession.findUnique({
        where: { id: checkout.id },
        select: { status: true, completedAt: true },
      });
      expect(completedCheckout?.status).toBe("COMPLETED");
      expect(completedCheckout?.completedAt).toBeTruthy();
    } finally {
      await prisma.billingEvent.deleteMany({ where: { providerEventId: { startsWith: "evt_smoke_" } } });
      if (seekerId) {
        await prisma.jobSeekerCreditTransaction.deleteMany({ where: { userId: seekerId } });
        await prisma.jobSeekerUsageCounter.deleteMany({ where: { userId: seekerId } });
        await prisma.jobSeekerCheckoutSession.deleteMany({ where: { userId: seekerId } });
        await prisma.jobSeekerWallet.deleteMany({ where: { userId: seekerId } });
      }
      await prisma.jobSeekerCreditPack.deleteMany({ where: { code: packCode } });
      await prisma.jobApplicationSubmission.deleteMany({ where: { submittedByUser: { email: seekerEmail } } });
      await prisma.jobApplication.deleteMany({ where: { title: { contains: suffix } } });
      await prisma.authSession.deleteMany({ where: { user: { email: { in: [companyEmail, seekerEmail] } } } });
      await prisma.authOtpChallenge.deleteMany({ where: { destination: { in: [companyEmail, seekerEmail] } } });
      await prisma.registrationDraft.deleteMany({ where: { email: { in: [companyEmail, seekerEmail] } } });
      await prisma.user.deleteMany({ where: { email: { in: [companyEmail, seekerEmail] } } });
      if (companyId) {
        await prisma.billingEvent.deleteMany({ where: { companyId } });
        await prisma.checkoutSession.deleteMany({ where: { companyId } });
        await prisma.subscription.deleteMany({ where: { companyId } });
        await prisma.company.deleteMany({ where: { id: companyId } });
      }
      await prisma.company.deleteMany({ where: { registrationNumber } });
    }
  }, 30_000);
});

