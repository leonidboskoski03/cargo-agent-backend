import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { OtpChannel, OtpPurpose, UserRole } from "@prisma/client";
import { hashPassword } from "../../src/shared/auth/password.js";
import { initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("auth otp flows", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("requests and verifies email OTP for forgot password", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();
    const email = `otp-email-${suffix}@test.local`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Otp",
        lastName: "Email",
        email,
        phone: `+38160000${suffix.slice(-4)}`,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const requestResponse = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.FORGOT_PASSWORD,
        channel: OtpChannel.EMAIL,
        email,
      });

      expect(requestResponse.statusCode).toBe(200);
      expect(requestResponse.body.data.challengeId).toBeTypeOf("string");
      expect(requestResponse.body.data.code).toBeTypeOf("string");

      const verifyResponse = await request(app).post("/api/v1/auth/otp/verify").send({
        challengeId: requestResponse.body.data.challengeId,
        code: requestResponse.body.data.code,
      });

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.data.success).toBe(true);
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("supports simulated SMS OTP and enforces resend cooldown", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}1`;
    const phone = `+38161111${suffix.slice(-4)}`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Otp",
        lastName: "Sms",
        email: `otp-sms-${suffix}@test.local`,
        phone,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const requestResponse = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.FORGOT_PASSWORD,
        channel: OtpChannel.SMS,
        phone,
      });

      expect(requestResponse.statusCode).toBe(200);
      const challengeId = requestResponse.body.data.challengeId as string;
      expect(challengeId).toBeTypeOf("string");

      const resendResponse = await request(app).post("/api/v1/auth/otp/resend").send({ challengeId });
      expect(resendResponse.statusCode).toBe(429);
      expect(resendResponse.body.error.code).toBe("OTP_RESEND_COOLDOWN");

      const verifyResponse = await request(app).post("/api/v1/auth/otp/verify").send({
        challengeId,
        code: requestResponse.body.data.code,
      });
      expect(verifyResponse.statusCode).toBe(200);
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("requires verified REGISTER_VERIFY OTP before user registration", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}2`;
    const email = `otp-register-${suffix}@test.local`;

    try {
      const withoutOtp = await request(app).post("/api/v1/auth/register").send({
        firstName: "Otp",
        lastName: "Register",
        email,
        password: "StrongPass123!",
        role: UserRole.JOB_SEEKER,
        otpChallengeId: "invalid-challenge-id",
      });
      expect(withoutOtp.statusCode).toBe(400);
      expect(withoutOtp.body.error.code).toBe("OTP_REQUIRED");

      const requestOtp = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.REGISTER_VERIFY,
        channel: OtpChannel.EMAIL,
        email,
      });
      expect(requestOtp.statusCode).toBe(200);

      const challengeId = requestOtp.body.data.challengeId as string;
      const code = requestOtp.body.data.code as string;

      const verifyOtp = await request(app).post("/api/v1/auth/otp/verify").send({ challengeId, code });
      expect(verifyOtp.statusCode).toBe(200);

      const registerResponse = await request(app).post("/api/v1/auth/register").send({
        firstName: "Otp",
        lastName: "Register",
        email,
        password: "StrongPass123!",
        role: UserRole.JOB_SEEKER,
        otpChallengeId: challengeId,
      });
      expect(registerResponse.statusCode).toBe(200);
      expect(registerResponse.body.data.user.email).toBe(email);
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { destination: email } });
      await prisma.authSession.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });
    }
  }, 20_000);

  it("completes login with verified LOGIN_MFA OTP and rejects challenge reuse", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-mfa`;
    const email = `otp-mfa-${suffix}@test.local`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Otp",
        lastName: "Mfa",
        email,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const requestOtp = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.LOGIN_MFA,
        channel: OtpChannel.EMAIL,
        email,
      });
      expect(requestOtp.statusCode).toBe(200);

      const challengeId = requestOtp.body.data.challengeId as string;
      const code = requestOtp.body.data.code as string;

      const verifyOtp = await request(app).post("/api/v1/auth/otp/verify").send({ challengeId, code });
      expect(verifyOtp.statusCode).toBe(200);

      const loginWithOtp = await request(app).post("/api/v1/auth/login/verify-otp").send({
        email,
        password: "OldPass123!",
        otpChallengeId: challengeId,
      });
      expect(loginWithOtp.statusCode).toBe(200);
      expect(loginWithOtp.body.data.user.email).toBe(email);

      const reuseAttempt = await request(app).post("/api/v1/auth/login/verify-otp").send({
        email,
        password: "OldPass123!",
        otpChallengeId: challengeId,
      });
      expect(reuseAttempt.statusCode).toBe(400);
      expect(reuseAttempt.body.error.code).toBe("OTP_REQUIRED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.authSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("requires MFA during login for configured roles", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-mfa-role`;
    const email = `otp-role-${suffix}@test.local`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.COMPANY_ADMIN,
        firstName: "Otp",
        lastName: "RoleMfa",
        email,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email,
        password: "OldPass123!",
      });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.data.nextAction?.type).toBe("MFA_REQUIRED");
      expect(loginResponse.body.data.challengeId).toBeTypeOf("string");
      expect(loginResponse.body.data.code).toBeTypeOf("string");

      const challengeId = loginResponse.body.data.challengeId as string;
      const code = loginResponse.body.data.code as string;

      const verifyOtp = await request(app).post("/api/v1/auth/otp/verify").send({ challengeId, code });
      expect(verifyOtp.statusCode).toBe(200);

      const loginWithOtp = await request(app).post("/api/v1/auth/login/verify-otp").send({
        email,
        password: "OldPass123!",
        otpChallengeId: challengeId,
      });

      expect(loginWithOtp.statusCode).toBe(200);
      expect(loginWithOtp.body.data.user.email).toBe(email);
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.authSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);
});

