import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, OtpChannel, OtpPurpose, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("company invites flow", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("allows company admin to invite and user to accept invite", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Co ${suffix}`,
        registrationNumber: `INV-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const invited = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invited",
        lastName: "User",
        email: `invited-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const invitedToken = authHeader(signAccessToken, {
      userId: invited.id,
      role: invited.role,
      email: invited.email,
    });

    try {
      const createInviteResponse = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({
          invitedEmail: invited.email,
          targetRole: UserRole.COMPANY_DRIVER,
        });

      expect(createInviteResponse.statusCode).toBe(201);
      const inviteId = createInviteResponse.body.data.id as string;
      const acceptToken = createInviteResponse.body.data.acceptToken as string;
      expect(acceptToken).toBeTruthy();

      const listInvitesResponse = await request(app).get("/api/v1/company-invites").set("Authorization", adminToken);
      expect(listInvitesResponse.statusCode).toBe(200);
      const ids = (listInvitesResponse.body.data as Array<{ id: string }>).map((item) => item.id);
      expect(ids).toContain(inviteId);

      const acceptInviteResponse = await request(app)
        .post("/api/v1/auth/otp/request")
        .set("Authorization", invitedToken)
        .send({
          purpose: OtpPurpose.INVITE_ACCEPT,
          channel: OtpChannel.EMAIL,
          email: invited.email,
        });

      expect(acceptInviteResponse.statusCode).toBe(200);
      const otpChallengeId = acceptInviteResponse.body.data.challengeId as string;
      const otpCode = acceptInviteResponse.body.data.code as string;

      const verifyOtpResponse = await request(app)
        .post("/api/v1/auth/otp/verify")
        .set("Authorization", invitedToken)
        .send({
          challengeId: otpChallengeId,
          code: otpCode,
        });
      expect(verifyOtpResponse.statusCode).toBe(200);

      const acceptFinalResponse = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId });

      expect(acceptFinalResponse.statusCode).toBe(200);
      expect(acceptFinalResponse.body.data.user.companyId).toBe(company.id);
      expect(acceptFinalResponse.body.data.user.role).toBe(UserRole.COMPANY_DRIVER);

      const refreshedUser = await prisma.user.findUnique({ where: { id: invited.id } });
      expect(refreshedUser?.companyId).toBe(company.id);
      expect(refreshedUser?.role).toBe(UserRole.COMPANY_DRIVER);

      const refreshedInvite = await prisma.companyInvite.findUnique({ where: { id: inviteId } });
      expect(refreshedInvite?.status).toBe("ACCEPTED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: invited.id } });
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invited.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("blocks accepting invite with mismatched email", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Co 2 ${suffix}`,
        registrationNumber: `INV2-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite2-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const invited = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invited",
        lastName: "User",
        email: `invited2-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Other",
        lastName: "User",
        email: `other-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const otherToken = authHeader(signAccessToken, {
      userId: otherUser.id,
      role: otherUser.role,
      email: otherUser.email,
    });

    try {
      const createInviteResponse = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({ invitedEmail: invited.email, targetRole: UserRole.COMPANY_DRIVER });

      expect(createInviteResponse.statusCode).toBe(201);
      const acceptToken = createInviteResponse.body.data.acceptToken as string;

      const acceptWithWrongUser = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", otherToken)
        .send({ token: acceptToken, otpChallengeId: "missing" });

      expect(acceptWithWrongUser.statusCode).toBe(403);
      expect(acceptWithWrongUser.body.error.code).toBe("INVITE_EMAIL_MISMATCH");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: { in: [invited.id, otherUser.id] } } });
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invited.id, otherUser.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("requires a verified INVITE_ACCEPT OTP before accepting invite", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-otp-required`;

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Otp Required Co ${suffix}`,
        registrationNumber: `INVOTP-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite-otp-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const invited = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invited",
        lastName: "User",
        email: `invited-otp-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const invitedToken = authHeader(signAccessToken, {
      userId: invited.id,
      role: invited.role,
      email: invited.email,
    });

    try {
      const createInviteResponse = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({ invitedEmail: invited.email, targetRole: UserRole.COMPANY_DRIVER });

      expect(createInviteResponse.statusCode).toBe(201);
      const acceptToken = createInviteResponse.body.data.acceptToken as string;

      const otpRequest = await request(app)
        .post("/api/v1/auth/otp/request")
        .set("Authorization", invitedToken)
        .send({
          purpose: OtpPurpose.INVITE_ACCEPT,
          channel: OtpChannel.EMAIL,
          email: invited.email,
        });

      expect(otpRequest.statusCode).toBe(200);
      const challengeId = otpRequest.body.data.challengeId as string;

      const acceptWithoutVerify = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId: challengeId });

      expect(acceptWithoutVerify.statusCode).toBe(400);
      expect(acceptWithoutVerify.body.error.code).toBe("OTP_REQUIRED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: invited.id } });
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invited.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("consumes verified invite OTP even when acceptance fails and blocks OTP reuse", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-otp-reuse`;

    const existingFree = await prisma.plan.findUnique({ where: { code: "FREE" } });
    const freePlan = await prisma.plan.upsert({
      where: { code: "FREE" },
      update: {
        isActive: true,
        maxTeamMembers: 2,
      },
      create: {
        code: "FREE",
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        maxTeamMembers: 2,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Otp Reuse Co ${suffix}`,
        registrationNumber: `INVOTP2-${suffix}`,
        countryCode: "RS",
        city: "Nis",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite-otp2-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const invited = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invited",
        lastName: "User",
        email: `invited-otp2-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const invitedToken = authHeader(signAccessToken, {
      userId: invited.id,
      role: invited.role,
      email: invited.email,
    });

    try {
      const createInviteResponse = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({ invitedEmail: invited.email, targetRole: UserRole.COMPANY_DRIVER });

      expect(createInviteResponse.statusCode).toBe(201);
      const acceptToken = createInviteResponse.body.data.acceptToken as string;

      const otpRequest = await request(app)
        .post("/api/v1/auth/otp/request")
        .set("Authorization", invitedToken)
        .send({
          purpose: OtpPurpose.INVITE_ACCEPT,
          channel: OtpChannel.EMAIL,
          email: invited.email,
        });

      expect(otpRequest.statusCode).toBe(200);
      const challengeId = otpRequest.body.data.challengeId as string;
      const code = otpRequest.body.data.code as string;

      const verifyOtp = await request(app)
        .post("/api/v1/auth/otp/verify")
        .set("Authorization", invitedToken)
        .send({ challengeId, code });

      expect(verifyOtp.statusCode).toBe(200);

      await prisma.plan.update({
        where: { id: freePlan.id },
        data: { maxTeamMembers: 1 },
      });

      const blockedByLimit = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId: challengeId });

      expect(blockedByLimit.statusCode).toBe(403);
      expect(blockedByLimit.body.error.code).toBe("USAGE_LIMIT_REACHED");

      await prisma.plan.update({
        where: { id: freePlan.id },
        data: { maxTeamMembers: 2 },
      });

      const reuseAttempt = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId: challengeId });

      expect(reuseAttempt.statusCode).toBe(400);
      expect(reuseAttempt.body.error.code).toBe("OTP_REQUIRED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: invited.id } });
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invited.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });

      if (existingFree) {
        await prisma.plan.update({
          where: { id: existingFree.id },
          data: { maxTeamMembers: existingFree.maxTeamMembers, isActive: existingFree.isActive },
        });
      }
    }
  }, 25_000);

  it("blocks accepting an expired invite and marks it as expired", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-expired`;

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Expired Co ${suffix}`,
        registrationNumber: `INVEXP-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite-exp-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const invited = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invited",
        lastName: "User",
        email: `invited-exp-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const invitedToken = authHeader(signAccessToken, {
      userId: invited.id,
      role: invited.role,
      email: invited.email,
    });

    try {
      const createInviteResponse = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({ invitedEmail: invited.email, targetRole: UserRole.COMPANY_DRIVER });

      expect(createInviteResponse.statusCode).toBe(201);
      const inviteId = createInviteResponse.body.data.id as string;
      const acceptToken = createInviteResponse.body.data.acceptToken as string;

      await prisma.companyInvite.update({
        where: { id: inviteId },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const otpRequest = await request(app)
        .post("/api/v1/auth/otp/request")
        .set("Authorization", invitedToken)
        .send({
          purpose: OtpPurpose.INVITE_ACCEPT,
          channel: OtpChannel.EMAIL,
          email: invited.email,
        });

      expect(otpRequest.statusCode).toBe(200);
      const otpChallengeId = otpRequest.body.data.challengeId as string;
      const otpCode = otpRequest.body.data.code as string;

      const otpVerify = await request(app)
        .post("/api/v1/auth/otp/verify")
        .set("Authorization", invitedToken)
        .send({ challengeId: otpChallengeId, code: otpCode });

      expect(otpVerify.statusCode).toBe(200);

      const acceptResponse = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId });

      expect(acceptResponse.statusCode).toBe(410);
      expect(acceptResponse.body.error.code).toBe("INVITE_EXPIRED");

      const refreshedInvite = await prisma.companyInvite.findUnique({ where: { id: inviteId } });
      expect(refreshedInvite?.status).toBe("EXPIRED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: invited.id } });
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invited.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("blocks accepting a revoked invite", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-revoked`;

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Revoked Co ${suffix}`,
        registrationNumber: `INVREV-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite-rev-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const invited = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invited",
        lastName: "User",
        email: `invited-rev-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const invitedToken = authHeader(signAccessToken, {
      userId: invited.id,
      role: invited.role,
      email: invited.email,
    });

    try {
      const createInviteResponse = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({ invitedEmail: invited.email, targetRole: UserRole.COMPANY_DRIVER });

      expect(createInviteResponse.statusCode).toBe(201);
      const inviteId = createInviteResponse.body.data.id as string;
      const acceptToken = createInviteResponse.body.data.acceptToken as string;

      const revokeResponse = await request(app)
        .post(`/api/v1/company-invites/${inviteId}/revoke`)
        .set("Authorization", adminToken)
        .send({});

      expect(revokeResponse.statusCode).toBe(200);

      const acceptResponse = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId: "challenge-revoked" });

      expect(acceptResponse.statusCode).toBe(410);
      expect(acceptResponse.body.error.code).toBe("INVITE_REVOKED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: invited.id } });
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invited.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("blocks reusing an already accepted invite token", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-used`;

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Used Co ${suffix}`,
        registrationNumber: `INVUSED-${suffix}`,
        countryCode: "RS",
        city: "Nis",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite-used-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const invited = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Invited",
        lastName: "User",
        email: `invited-used-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const invitedToken = authHeader(signAccessToken, {
      userId: invited.id,
      role: invited.role,
      email: invited.email,
    });

    try {
      const createInviteResponse = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({ invitedEmail: invited.email, targetRole: UserRole.COMPANY_DRIVER });

      expect(createInviteResponse.statusCode).toBe(201);
      const acceptToken = createInviteResponse.body.data.acceptToken as string;

      const otpRequest = await request(app)
        .post("/api/v1/auth/otp/request")
        .set("Authorization", invitedToken)
        .send({
          purpose: OtpPurpose.INVITE_ACCEPT,
          channel: OtpChannel.EMAIL,
          email: invited.email,
        });

      expect(otpRequest.statusCode).toBe(200);
      const otpChallengeId = otpRequest.body.data.challengeId as string;
      const otpCode = otpRequest.body.data.code as string;

      const otpVerify = await request(app)
        .post("/api/v1/auth/otp/verify")
        .set("Authorization", invitedToken)
        .send({ challengeId: otpChallengeId, code: otpCode });

      expect(otpVerify.statusCode).toBe(200);

      const firstAccept = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId });

      expect(firstAccept.statusCode).toBe(200);

      const secondAccept = await request(app)
        .post("/api/v1/company-invites/accept")
        .set("Authorization", invitedToken)
        .send({ token: acceptToken, otpChallengeId: "challenge-used" });

      expect(secondAccept.statusCode).toBe(409);
      expect(secondAccept.body.error.code).toBe("INVITE_ALREADY_ACCEPTED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: invited.id } });
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invited.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("blocks invite creation when TEAM_MEMBERS limit is reached", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-team-cap`;

    const existingFree = await prisma.plan.findUnique({ where: { code: "FREE" } });
    const freePlan = await prisma.plan.upsert({
      where: { code: "FREE" },
      update: {
        isActive: true,
        maxTeamMembers: 1,
      },
      create: {
        code: "FREE",
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
        maxTeamMembers: 1,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Invite Cap Co ${suffix}`,
        registrationNumber: `INVCAP-${suffix}`,
        countryCode: "RS",
        city: "Nis",
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Invite",
        lastName: "Admin",
        email: `invite-cap-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const adminToken = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    try {
      const response = await request(app)
        .post("/api/v1/company-invites")
        .set("Authorization", adminToken)
        .send({
          invitedEmail: `new-member-${suffix}@test.local`,
          targetRole: UserRole.COMPANY_DRIVER,
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.error.code).toBe("USAGE_LIMIT_REACHED");
      expect(response.body.error.details.metric).toBe("TEAM_MEMBERS");
      expect(response.body.error.details.limit).toBe(1);
    } finally {
      await prisma.companyInvite.deleteMany({ where: { companyId: company.id } });
      await prisma.user.deleteMany({ where: { id: admin.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });

      if (existingFree) {
        await prisma.plan.update({
          where: { id: existingFree.id },
          data: { maxTeamMembers: existingFree.maxTeamMembers, isActive: existingFree.isActive },
        });
      }
    }
  }, 25_000);
});
