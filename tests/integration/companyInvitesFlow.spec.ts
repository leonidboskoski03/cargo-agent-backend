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
});

