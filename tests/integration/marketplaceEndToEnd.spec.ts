import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, JobSeekerCreditTxType, JobSeekerUsageMetric, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("marketplace end-to-end flows", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  }, 60_000);

  it("runs company FREE flow: register -> posts -> bid -> contract -> invite -> company job listing", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-company-flow`;

    const companyAdminEmail = `flow-admin-${suffix}@test.local`;
    const companyRegistrationNumber = `MK-FLOW-${suffix}`;
    const invitedEmail = `flow-driver-${suffix}@test.local`;

    const carrierCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Carrier ${suffix}`,
        registrationNumber: `MK-CARRIER-${suffix}`,
        countryCode: "MK",
        city: "Skopje",
      },
      select: { id: true },
    });

    const carrierAdmin = await prisma.user.create({
      data: {
        companyId: carrierCompany.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Carrier",
        lastName: "Admin",
        email: `carrier-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
      select: { id: true, email: true, role: true, companyId: true },
    });

    const invitedUser = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invite",
        lastName: "Target",
        email: invitedEmail,
        passwordHash: "hash",
      },
      select: { id: true, email: true, role: true },
    });

    let companyId: string | null = null;
    let createdOriginLocationId: string | null = null;
    let createdDestinationLocationId: string | null = null;
    let createdRouteId: string | null = null;

    try {
      const start = await request(app).post("/api/v1/auth/registration/start").send({
        kind: "COMPANY",
        firstName: "Flow",
        lastName: "Admin",
        email: companyAdminEmail,
        password: "StrongPass123!",
      });
      expect(start.statusCode).toBe(200);

      const draftId = start.body.data.draftId as string;
      const code = start.body.data.code as string;

      const verify = await request(app).post("/api/v1/auth/registration/verify-otp").send({ draftId, code });
      expect(verify.statusCode).toBe(200);

      const complete = await request(app).post("/api/v1/auth/registration/complete-company").send({
        draftId,
        companyName: `Flow Logistics ${suffix}`,
        companyType: "SHIPPER",
        registrationNumber: companyRegistrationNumber,
        address: "Street 1",
        countryCode: "MK",
        city: "Skopje",
        planCode: "FREE",
      });
      expect(complete.statusCode).toBe(200);
      expect(complete.body.data.user.role).toBe(UserRole.COMPANY_ADMIN);
      expect(complete.body.data.checkout).toBeNull();

      const companyAdmin = await prisma.user.findUnique({
        where: { email: companyAdminEmail },
        select: { id: true, email: true, role: true, companyId: true },
      });

      expect(companyAdmin?.companyId).toBeTruthy();
      companyId = companyAdmin?.companyId ?? null;

      const shipperToken = authHeader(signAccessToken, {
        userId: companyAdmin?.id as string,
        role: companyAdmin?.role as UserRole,
        companyId: companyAdmin?.companyId ?? undefined,
        email: companyAdmin?.email as string,
      });

      const carrierToken = authHeader(signAccessToken, {
        userId: carrierAdmin.id,
        role: carrierAdmin.role,
        companyId: carrierAdmin.companyId ?? undefined,
        email: carrierAdmin.email,
      });

      const invitedToken = authHeader(signAccessToken, {
        userId: invitedUser.id,
        role: invitedUser.role,
        email: invitedUser.email,
      });

      const subscription = await request(app)
        .get("/api/v1/subscriptions/me")
        .set("Authorization", shipperToken);
      expect(subscription.statusCode).toBe(200);
      expect(subscription.body.data.planCode).toBe("FREE");

      const origin = await request(app)
        .post("/api/v1/locations")
        .set("Authorization", shipperToken)
        .send({ countryCode: "MK", city: "Skopje" });
      expect(origin.statusCode).toBe(201);
      createdOriginLocationId = origin.body.data.id as string;

      const destination = await request(app)
        .post("/api/v1/locations")
        .set("Authorization", shipperToken)
        .send({ countryCode: "RS", city: "Belgrade" });
      expect(destination.statusCode).toBe(201);
      createdDestinationLocationId = destination.body.data.id as string;

      const route = await request(app)
        .post("/api/v1/routes")
        .set("Authorization", shipperToken)
        .send({
          originLocationId: origin.body.data.id,
          destinationLocationId: destination.body.data.id,
          distanceKm: 430,
        });
      expect(route.statusCode).toBe(201);
      createdRouteId = route.body.data.id as string;

      const post1 = await request(app)
        .post("/api/v1/posts")
        .set("Authorization", shipperToken)
        .send({
          routeId: route.body.data.id,
          title: `Freight 1 ${suffix}`,
          priceType: "REQUEST_QUOTE",
          currency: "EUR",
        });
      expect(post1.statusCode).toBe(201);

      const post2 = await request(app)
        .post("/api/v1/posts")
        .set("Authorization", shipperToken)
        .send({
          routeId: route.body.data.id,
          title: `Freight 2 ${suffix}`,
          priceType: "REQUEST_QUOTE",
          currency: "EUR",
        });
      expect(post2.statusCode).toBe(201);

      const postList = await request(app).get("/api/v1/posts").set("Authorization", shipperToken);
      expect(postList.statusCode).toBe(200);
      expect(postList.body.data.length).toBeGreaterThanOrEqual(2);

      const bid = await request(app)
        .post("/api/v1/bids")
        .set("Authorization", carrierToken)
        .send({
          postId: post1.body.data.id,
          offeredPriceAmount: 1200,
          currency: "EUR",
        });
      expect(bid.statusCode).toBe(201);

      const accepted = await request(app)
        .patch(`/api/v1/bids/${bid.body.data.id}/status`)
        .set("Authorization", shipperToken)
        .send({ status: "ACCEPTED" });
      expect(accepted.statusCode).toBe(200);

      const contract = await request(app)
        .post("/api/v1/contracts")
        .set("Authorization", shipperToken)
        .send({
          postId: post1.body.data.id,
          acceptedBidId: bid.body.data.id,
        });
      expect(contract.statusCode).toBe(201);
      expect(contract.body.data.status).toBe("CONFIRMED");

      const invite = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", shipperToken)
        .send({
          invitedEmail,
          targetRole: "COMPANY_DRIVER",
        });
      expect(invite.statusCode).toBe(201);

      const inviteOtp = await request(app)
        .post("/api/v1/auth/otp/request")
        .set("Authorization", invitedToken)
        .send({ purpose: "INVITE_ACCEPT", channel: "EMAIL", email: invitedEmail });
      expect(inviteOtp.statusCode).toBe(200);

      const verifyInviteOtp = await request(app).post("/api/v1/auth/otp/verify").send({
        challengeId: inviteOtp.body.data.challengeId,
        code: inviteOtp.body.data.code,
      });
      expect(verifyInviteOtp.statusCode).toBe(200);

      const acceptInvite = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({
          token: invite.body.data.acceptToken,
          otpChallengeId: inviteOtp.body.data.challengeId,
        });
      expect(acceptInvite.statusCode).toBe(200);
      expect(acceptInvite.body.data.user.companyId).toBe(companyId);
      expect(acceptInvite.body.data.user.role).toBe(UserRole.COMPANY_DRIVER);

      const companyJobListing = await request(app)
        .post("/api/v1/job-applications")
        .set("Authorization", shipperToken)
        .send({
          title: `Need long-haul driver ${suffix}`,
          preferredCountryCode: "MK",
          preferredCity: "Skopje",
        });
      expect(companyJobListing.statusCode).toBe(201);
    } finally {
      await prisma.contract.deleteMany({ where: { post: { title: { contains: suffix } } } });
      await prisma.bid.deleteMany({ where: { post: { title: { contains: suffix } } } });
      await prisma.post.deleteMany({ where: { title: { contains: suffix } } });
      if (createdRouteId) {
        await prisma.route.deleteMany({ where: { id: createdRouteId } });
      }
      if (createdOriginLocationId || createdDestinationLocationId) {
        await prisma.location.deleteMany({
          where: {
            id: {
              in: [createdOriginLocationId, createdDestinationLocationId].filter((id): id is string => Boolean(id)),
            },
          },
        });
      }
      await prisma.jobApplicationSubmission.deleteMany({
        where: {
          OR: [{ submittedByUserId: invitedUser.id }, { submittedByUserId: carrierAdmin.id }],
        },
      });
      await prisma.jobApplication.deleteMany({ where: { title: { contains: suffix } } });
      await prisma.companyInvite.deleteMany({ where: { invitedEmail } });
      await prisma.authOtpChallenge.deleteMany({ where: { destination: invitedEmail } });
      await prisma.authSession.deleteMany({ where: { user: { email: { in: [companyAdminEmail, invitedEmail, carrierAdmin.email] } } } });
      await prisma.user.deleteMany({ where: { email: { in: [companyAdminEmail, invitedEmail, carrierAdmin.email] } } });
      if (companyId) {
        await prisma.company.deleteMany({ where: { id: companyId } });
      }
      await prisma.company.deleteMany({ where: { id: carrierCompany.id } });
      await prisma.registrationDraft.deleteMany({ where: { email: companyAdminEmail } });
    }
  }, 35_000);

  it("runs job seeker flow: profile setup -> credits spend -> apply -> promote listing/submission", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-seeker-flow`;

    const seekerEmail = `flow-seeker-${suffix}@test.local`;
    const secondSeekerEmail = `flow-seeker2-${suffix}@test.local`;
    const companyEmail = `flow-company-admin-${suffix}@test.local`;

    const freeMonthlyLimit = Number(process.env.JOB_SEEKER_FREE_APPLICATIONS_PER_MONTH ?? 10);
    const applicationCreditCost = Number(process.env.JOB_SEEKER_APPLICATION_CREDIT_COST ?? 1);
    const listingPromotionCreditCost = Number(process.env.JOB_SEEKER_LISTING_PROMOTION_CREDIT_COST ?? 2);
    const submissionPromotionCreditCost = Number(process.env.JOB_SEEKER_SUBMISSION_PROMOTION_CREDIT_COST ?? 1);

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.BOTH,
        name: `Jobs Co ${suffix}`,
        registrationNumber: `MK-JOBS-${suffix}`,
        countryCode: "MK",
        city: "Skopje",
      },
      select: { id: true },
    });

    const companyAdmin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Jobs",
        lastName: "Admin",
        email: companyEmail,
        passwordHash: "hash",
      },
      select: { id: true, email: true, role: true, companyId: true },
    });

    const secondSeeker = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Second",
        lastName: "Seeker",
        email: secondSeekerEmail,
        passwordHash: "hash",
      },
      select: { id: true, email: true, role: true },
    });

    try {
      const start = await request(app).post("/api/v1/auth/registration/start").send({
        kind: "JOB_SEEKER",
        firstName: "Flow",
        lastName: "Seeker",
        email: seekerEmail,
        password: "StrongPass123!",
      });
      expect(start.statusCode).toBe(200);

      const draftId = start.body.data.draftId as string;
      const code = start.body.data.code as string;

      const verify = await request(app).post("/api/v1/auth/registration/verify-otp").send({ draftId, code });
      expect(verify.statusCode).toBe(200);

      const complete = await request(app).post("/api/v1/auth/registration/complete-job-seeker").send({
        draftId,
        countryCode: "MK",
        city: "Skopje",
        headline: "Owner-operator",
        yearsExperience: 5,
        availability: "Immediate",
        preferredRoutes: ["MK-RS", "MK-BG"],
      });
      expect(complete.statusCode).toBe(200);

      const seeker = await prisma.user.findUnique({
        where: { email: seekerEmail },
        select: { id: true, email: true, role: true },
      });
      expect(seeker).toBeTruthy();

      const seekerToken = authHeader(signAccessToken, {
        userId: seeker?.id as string,
        role: seeker?.role as UserRole,
        email: seeker?.email as string,
      });

      const companyToken = authHeader(signAccessToken, {
        userId: companyAdmin.id,
        role: companyAdmin.role,
        companyId: companyAdmin.companyId ?? undefined,
        email: companyAdmin.email,
      });

      const secondSeekerToken = authHeader(signAccessToken, {
        userId: secondSeeker.id,
        role: secondSeeker.role,
        email: secondSeeker.email,
      });

      const completion = await request(app)
        .get("/api/v1/users/me/profile-completion")
        .set("Authorization", seekerToken);
      expect(completion.statusCode).toBe(200);
      expect(completion.body.data.percent).toBeGreaterThan(40);

      const myListing = await request(app)
        .post("/api/v1/job-applications")
        .set("Authorization", seekerToken)
        .send({
          title: `Looking for work ${suffix}`,
          preferredCountryCode: "MK",
          preferredCity: "Skopje",
        });
      expect(myListing.statusCode).toBe(201);

      const otherListing = await request(app)
        .post("/api/v1/job-applications")
        .set("Authorization", secondSeekerToken)
        .send({
          title: `Other seeker ${suffix}`,
          preferredCountryCode: "MK",
          preferredCity: "Skopje",
        });
      expect(otherListing.statusCode).toBe(201);

      // Simulate purchased credits so we can assert spend behavior without Stripe webhook setup.
      const wallet =
        (await prisma.jobSeekerWallet.findUnique({ where: { userId: seeker?.id as string } })) ??
        (await prisma.jobSeekerWallet.create({ data: { userId: seeker?.id as string } }));

      const purchasedCredits = 10;
      const updatedWallet = await prisma.jobSeekerWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCredits: { increment: purchasedCredits },
          version: { increment: 1 },
        },
      });

      await prisma.jobSeekerCreditTransaction.create({
        data: {
          walletId: wallet.id,
          userId: seeker?.id as string,
          type: JobSeekerCreditTxType.PURCHASE,
          amountCredits: purchasedCredits,
          reasonCode: "TEST_PURCHASE",
          referenceType: "TEST",
          referenceId: suffix,
          balanceAfter: updatedWallet.balanceCredits,
        },
      });

      const promoteListing = await request(app)
        .post(`/api/v1/job-applications/${myListing.body.data.id}/promote`)
        .set("Authorization", seekerToken)
        .send({ days: 7 });
      expect(promoteListing.statusCode).toBe(200);
      expect(promoteListing.body.data.billing.creditCost).toBe(listingPromotionCreditCost);

      const companyFeed = await request(app).get("/api/v1/job-applications").set("Authorization", companyToken);
      expect(companyFeed.statusCode).toBe(200);

      const companyFeedIds = (companyFeed.body.data as Array<{ id: string }>).map((item) => item.id);
      const promotedIndex = companyFeedIds.indexOf(myListing.body.data.id);
      const nonPromotedIndex = companyFeedIds.indexOf(otherListing.body.data.id);
      expect(promotedIndex).toBeGreaterThanOrEqual(0);
      expect(nonPromotedIndex).toBeGreaterThanOrEqual(0);
      expect(promotedIndex).toBeLessThan(nonPromotedIndex);

      const companyJob = await request(app)
        .post("/api/v1/job-applications")
        .set("Authorization", companyToken)
        .send({
          title: `Company opening ${suffix}`,
          preferredCountryCode: "MK",
          preferredCity: "Skopje",
        });
      expect(companyJob.statusCode).toBe(201);

      await prisma.jobSeekerUsageCounter.upsert({
        where: {
          userId_metric_periodStart: {
            userId: seeker?.id as string,
            metric: JobSeekerUsageMetric.JOB_APPLICATIONS_PER_MONTH,
            periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 0, 0, 0, 0)),
          },
        },
        create: {
          userId: seeker?.id as string,
          metric: JobSeekerUsageMetric.JOB_APPLICATIONS_PER_MONTH,
          periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 0, 0, 0, 0)),
          used: freeMonthlyLimit,
          limitSnapshot: freeMonthlyLimit,
        },
        update: {
          used: freeMonthlyLimit,
          limitSnapshot: freeMonthlyLimit,
        },
      });

      const applyWithCredits = await request(app)
        .post(`/api/v1/job-applications/${companyJob.body.data.id}/apply`)
        .set("Authorization", seekerToken)
        .send({ message: "Interested" });
      expect(applyWithCredits.statusCode).toBe(201);
      expect(applyWithCredits.body.data.billing.mode).toBe("CREDITS");
      expect(applyWithCredits.body.data.billing.creditCost).toBe(applicationCreditCost);

      const secondApply = await request(app)
        .post(`/api/v1/job-applications/${companyJob.body.data.id}/apply`)
        .set("Authorization", secondSeekerToken)
        .send({ message: "I can do this" });
      expect(secondApply.statusCode).toBe(201);

      const promoteSubmission = await request(app)
        .post(`/api/v1/job-applications/${companyJob.body.data.id}/submissions/${applyWithCredits.body.data.id}/promote`)
        .set("Authorization", seekerToken)
        .send({ days: 7 });
      expect(promoteSubmission.statusCode).toBe(200);
      expect(promoteSubmission.body.data.billing.creditCost).toBe(submissionPromotionCreditCost);

      const submissionsForCompany = await request(app)
        .get(`/api/v1/job-applications/${companyJob.body.data.id}/submissions`)
        .set("Authorization", companyToken);
      expect(submissionsForCompany.statusCode).toBe(200);

      const submissionIds = (submissionsForCompany.body.data as Array<{ id: string }>).map((item) => item.id);
      expect(submissionIds[0]).toBe(applyWithCredits.body.data.id);

      const walletResponse = await request(app)
        .get("/api/v1/job-seeker-billing/wallet")
        .set("Authorization", seekerToken);
      expect(walletResponse.statusCode).toBe(200);

      const expectedBalance =
        purchasedCredits - applicationCreditCost - listingPromotionCreditCost - submissionPromotionCreditCost;
      expect(walletResponse.body.data.balanceCredits).toBe(expectedBalance);
    } finally {
      await prisma.jobSeekerCreditTransaction.deleteMany({
        where: {
          OR: [{ referenceId: suffix }, { user: { email: { in: [seekerEmail, secondSeekerEmail] } } }],
        },
      });
      await prisma.jobApplicationSubmission.deleteMany({
        where: { submittedByUser: { email: { in: [seekerEmail, secondSeekerEmail, companyEmail] } } },
      });
      await prisma.jobApplication.deleteMany({ where: { title: { contains: suffix } } });
      await prisma.jobSeekerUsageCounter.deleteMany({ where: { user: { email: { in: [seekerEmail, secondSeekerEmail] } } } });
      await prisma.jobSeekerWallet.deleteMany({ where: { user: { email: { in: [seekerEmail, secondSeekerEmail] } } } });
      await prisma.authSession.deleteMany({ where: { user: { email: { in: [seekerEmail, secondSeekerEmail, companyEmail] } } } });
      await prisma.authOtpChallenge.deleteMany({ where: { destination: seekerEmail } });
      await prisma.registrationDraft.deleteMany({ where: { email: seekerEmail } });
      await prisma.user.deleteMany({ where: { email: { in: [seekerEmail, secondSeekerEmail, companyEmail] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 40_000);
});

