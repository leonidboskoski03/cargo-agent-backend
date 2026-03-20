import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { hashPassword } from "../../src/shared/auth/password.js";
import { initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("auth password flows", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("resets password and invalidates old access token", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Reset",
        lastName: "User",
        email: `reset-${suffix}@test.local`,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: {
        id: true,
        email: true,
        role: true,
        tokenVersion: true,
      },
    });

    const oldAccessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      sv: user.tokenVersion,
    });

    try {
      const forgotResponse = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: user.email });

      expect(forgotResponse.statusCode).toBe(200);
      const challengeId = forgotResponse.body.data.challengeId as string | undefined;
      const code = forgotResponse.body.data.code as string | undefined;
      expect(typeof challengeId).toBe("string");
      expect(typeof code).toBe("string");

      const verifyOtpResponse = await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ challengeId, code });
      expect(verifyOtpResponse.statusCode).toBe(200);

      const resetResponse = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ otpChallengeId: challengeId, newPassword: "NewPass123!" });

      expect(resetResponse.statusCode).toBe(200);

      const oldTokenGuardResponse = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${oldAccessToken}`);

      expect(oldTokenGuardResponse.statusCode).toBe(401);
      expect(oldTokenGuardResponse.body.error.code).toBe("SESSION_REVOKED");

      const loginWithOldPassword = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "OldPass123!" });
      expect(loginWithOldPassword.statusCode).toBe(401);

      const loginWithNewPassword = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "NewPass123!" });
      expect(loginWithNewPassword.statusCode).toBe(200);
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.authSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("changes password for authenticated user and revokes previous token version", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-change`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Change",
        lastName: "Password",
        email: `change-${suffix}@test.local`,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: {
        id: true,
        email: true,
        role: true,
        tokenVersion: true,
      },
    });

    const oldAccessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      sv: user.tokenVersion,
    });

    try {
      const changeResponse = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${oldAccessToken}`)
        .send({ currentPassword: "OldPass123!", newPassword: "NewPass123!" });

      expect(changeResponse.statusCode).toBe(200);

      const oldTokenGuardResponse = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${oldAccessToken}`);

      expect(oldTokenGuardResponse.statusCode).toBe(401);
      expect(oldTokenGuardResponse.body.error.code).toBe("SESSION_REVOKED");

      const loginWithOldPassword = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "OldPass123!" });
      expect(loginWithOldPassword.statusCode).toBe(401);

      const loginWithNewPassword = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "NewPass123!" });
      expect(loginWithNewPassword.statusCode).toBe(200);
    } finally {
      await prisma.authSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("lists active sessions and allows revoking a specific session", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const agentOne = request.agent(app);
    const agentTwo = request.agent(app);
    const suffix = `${Date.now()}-sessions`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Session",
        lastName: "User",
        email: `sessions-${suffix}@test.local`,
        passwordHash: await hashPassword("Pass12345!"),
      },
      select: {
        id: true,
        email: true,
      },
    });

    try {
      const loginOne = await agentOne.post("/api/v1/auth/login").send({ email: user.email, password: "Pass12345!" });
      expect(loginOne.statusCode).toBe(200);

      const loginTwo = await agentTwo.post("/api/v1/auth/login").send({ email: user.email, password: "Pass12345!" });
      expect(loginTwo.statusCode).toBe(200);

      const listBefore = await agentOne.get("/api/v1/auth/sessions");
      expect(listBefore.statusCode).toBe(200);
      const sessionsBefore = listBefore.body.data.sessions as Array<{ id: string; isCurrent: boolean }>;
      expect(Array.isArray(sessionsBefore)).toBe(true);
      expect(sessionsBefore.length).toBeGreaterThanOrEqual(2);
      expect(sessionsBefore.some((session) => session.isCurrent)).toBe(true);

      const toRevoke = sessionsBefore.find((session) => !session.isCurrent);
      expect(toRevoke?.id).toBeTypeOf("string");
      const revokeSessionId = toRevoke?.id;
      if (!revokeSessionId) {
        throw new Error("Expected a non-current session to revoke");
      }

      const revokeResponse = await agentOne.delete(`/api/v1/auth/sessions/${revokeSessionId}`);
      expect(revokeResponse.statusCode).toBe(200);

      const revoked = await prisma.authSession.findUnique({ where: { id: revokeSessionId }, select: { revokedAt: true } });
      expect(revoked?.revokedAt).toBeTruthy();

      const listAfter = await agentOne.get("/api/v1/auth/sessions");
      expect(listAfter.statusCode).toBe(200);
      const sessionsAfter = listAfter.body.data.sessions as Array<{ id: string }>;
      expect(sessionsAfter.some((session) => session.id === revokeSessionId)).toBe(false);
    } finally {
      await prisma.authSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);
});

