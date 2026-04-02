import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { OtpChannel, OtpPurpose, OtpStatus, UserRole } from "@prisma/client";
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

  it("completes JOB_SEEKER wizard registration flow", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-wiz-js`;
    const email = `wizard-js-${suffix}@test.local`;

    try {
      const startResponse = await request(app).post("/api/v1/auth/registration/start").send({
        kind: "JOB_SEEKER",
        firstName: "Wizard",
        lastName: "Seeker",
        email,
        phone: "+38970111222",
        password: "StrongPass123!",
      });

      expect(startResponse.statusCode).toBe(200);
      const draftId = startResponse.body.data.draftId as string;
      const code = startResponse.body.data.code as string;

      const verifyResponse = await request(app).post("/api/v1/auth/registration/verify-otp").send({
        draftId,
        code,
      });

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.data.kind).toBe("JOB_SEEKER");

      const completeResponse = await request(app).post("/api/v1/auth/registration/complete-job-seeker").send({
        draftId,
        countryCode: "MK",
        city: "Skopje",
        headline: "Regional Driver",
        yearsExperience: 3,
      });

      expect(completeResponse.statusCode).toBe(200);
      expect(completeResponse.body.data.user.email).toBe(email);
      expect(completeResponse.body.data.user.role).toBe(UserRole.JOB_SEEKER);
    } finally {
      await prisma.authSession.deleteMany({ where: { user: { email } } });
      await prisma.authOtpChallenge.deleteMany({ where: { destination: email } });
      await prisma.registrationDraft.deleteMany({ where: { email } });
      await prisma.user.deleteMany({ where: { email } });
    }
  }, 20_000);

  it("completes COMPANY wizard registration flow on FREE plan", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-wiz-company`;
    const email = `wizard-company-${suffix}@test.local`;
    const registrationNumber = `MK-WIZ-${suffix}`;

    try {
      const startResponse = await request(app).post("/api/v1/auth/registration/start").send({
        kind: "COMPANY",
        firstName: "Wizard",
        lastName: "Admin",
        email,
        password: "StrongPass123!",
      });

      expect(startResponse.statusCode).toBe(200);
      const draftId = startResponse.body.data.draftId as string;
      const code = startResponse.body.data.code as string;

      const verifyResponse = await request(app).post("/api/v1/auth/registration/verify-otp").send({
        draftId,
        code,
      });

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.data.kind).toBe("COMPANY");

      const completeResponse = await request(app).post("/api/v1/auth/registration/complete-company").send({
        draftId,
        companyName: "Wizard Logistics",
        companyType: "CARRIER",
        registrationNumber,
        address: "Main Street 1",
        countryCode: "MK",
        city: "Skopje",
        planCode: "FREE",
      });

      expect(completeResponse.statusCode).toBe(200);
      expect(completeResponse.body.data.user.email).toBe(email);
      expect(completeResponse.body.data.user.role).toBe(UserRole.COMPANY_ADMIN);
      expect(completeResponse.body.data.company.registrationNumber).toBe(registrationNumber);
      expect(completeResponse.body.data.checkout).toBeNull();
    } finally {
      await prisma.authSession.deleteMany({ where: { user: { email } } });
      await prisma.authOtpChallenge.deleteMany({ where: { destination: email } });
      await prisma.registrationDraft.deleteMany({ where: { email } });
      await prisma.user.deleteMany({ where: { email } });
      await prisma.company.deleteMany({ where: { registrationNumber } });
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

  it("rejects expired OTP challenges for verify and resend", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-expired`;
    const email = `otp-expired-${suffix}@test.local`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Otp",
        lastName: "Expired",
        email,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const challengeForVerify = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.FORGOT_PASSWORD,
        channel: OtpChannel.EMAIL,
        email,
      });
      expect(challengeForVerify.statusCode).toBe(200);
      const verifyChallengeId = challengeForVerify.body.data.challengeId as string;

      await prisma.authOtpChallenge.update({
        where: { id: verifyChallengeId },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const verifyExpired = await request(app).post("/api/v1/auth/otp/verify").send({
        challengeId: verifyChallengeId,
        code: challengeForVerify.body.data.code,
      });
      expect(verifyExpired.statusCode).toBe(400);
      expect(verifyExpired.body.error.code).toBe("OTP_EXPIRED");

      const challengeForResend = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.FORGOT_PASSWORD,
        channel: OtpChannel.EMAIL,
        email,
      });
      expect(challengeForResend.statusCode).toBe(200);
      const resendChallengeId = challengeForResend.body.data.challengeId as string;

      await prisma.authOtpChallenge.update({
        where: { id: resendChallengeId },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const resendExpired = await request(app).post("/api/v1/auth/otp/resend").send({
        challengeId: resendChallengeId,
      });
      expect(resendExpired.statusCode).toBe(400);
      expect(resendExpired.body.error.code).toBe("OTP_EXPIRED");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("locks OTP challenge after max invalid attempts and blocks further verification", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-lock`;
    const email = `otp-lock-${suffix}@test.local`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Otp",
        lastName: "Lock",
        email,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const requestOtp = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.FORGOT_PASSWORD,
        channel: OtpChannel.EMAIL,
        email,
      });

      expect(requestOtp.statusCode).toBe(200);
      const challengeId = requestOtp.body.data.challengeId as string;
      const correctCode = requestOtp.body.data.code as string;
      const wrongCode = `${correctCode.slice(0, -1)}${correctCode.endsWith("0") ? "1" : "0"}`;

      for (let i = 1; i <= 5; i += 1) {
        const attempt = await request(app).post("/api/v1/auth/otp/verify").send({
          challengeId,
          code: wrongCode,
        });

        if (i < 5) {
          expect(attempt.statusCode).toBe(400);
          expect(attempt.body.error.code).toBe("OTP_INVALID");
        } else {
          expect(attempt.statusCode).toBe(429);
          expect(attempt.body.error.code).toBe("OTP_ATTEMPTS_EXCEEDED");
        }
      }

      const lockedChallenge = await prisma.authOtpChallenge.findUnique({
        where: { id: challengeId },
        select: { status: true, attemptCount: true },
      });
      expect(lockedChallenge?.status).toBe(OtpStatus.LOCKED);
      expect(lockedChallenge?.attemptCount).toBe(5);

      const verifyAfterLock = await request(app).post("/api/v1/auth/otp/verify").send({
        challengeId,
        code: correctCode,
      });
      expect(verifyAfterLock.statusCode).toBe(400);
      expect(verifyAfterLock.body.error.code).toBe("OTP_INVALID");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("rotates OTP on resend after cooldown and invalidates previous code", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-resend-rotate`;
    const email = `otp-rotate-${suffix}@test.local`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Otp",
        lastName: "Rotate",
        email,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const requestOtp = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.FORGOT_PASSWORD,
        channel: OtpChannel.EMAIL,
        email,
      });

      expect(requestOtp.statusCode).toBe(200);
      const challengeId = requestOtp.body.data.challengeId as string;
      const oldCode = requestOtp.body.data.code as string;

      const cooldownResponse = await request(app).post("/api/v1/auth/otp/resend").send({ challengeId });
      expect(cooldownResponse.statusCode).toBe(429);
      expect(cooldownResponse.body.error.code).toBe("OTP_RESEND_COOLDOWN");

      await prisma.authOtpChallenge.update({
        where: { id: challengeId },
        data: { nextResendAt: new Date(Date.now() - 1_000) },
      });

      const resendResponse = await request(app).post("/api/v1/auth/otp/resend").send({ challengeId });
      expect(resendResponse.statusCode).toBe(200);
      const newCode = resendResponse.body.data.code as string;
      expect(newCode).toBeTypeOf("string");
      expect(newCode).not.toBe(oldCode);

      const oldCodeRejected = await request(app).post("/api/v1/auth/otp/verify").send({
        challengeId,
        code: oldCode,
      });
      expect(oldCodeRejected.statusCode).toBe(400);
      expect(oldCodeRejected.body.error.code).toBe("OTP_INVALID");

      const newCodeAccepted = await request(app).post("/api/v1/auth/otp/verify").send({
        challengeId,
        code: newCode,
      });
      expect(newCodeAccepted.statusCode).toBe(200);
      expect(newCodeAccepted.body.data.success).toBe(true);
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);

  it("treats verified OTP challenge as single-use at verify endpoint", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-single-use`;
    const email = `otp-single-use-${suffix}@test.local`;

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Otp",
        lastName: "SingleUse",
        email,
        passwordHash: await hashPassword("OldPass123!"),
      },
      select: { id: true },
    });

    try {
      const requestOtp = await request(app).post("/api/v1/auth/otp/request").send({
        purpose: OtpPurpose.FORGOT_PASSWORD,
        channel: OtpChannel.EMAIL,
        email,
      });
      expect(requestOtp.statusCode).toBe(200);

      const challengeId = requestOtp.body.data.challengeId as string;
      const code = requestOtp.body.data.code as string;

      const firstVerify = await request(app).post("/api/v1/auth/otp/verify").send({ challengeId, code });
      expect(firstVerify.statusCode).toBe(200);

      const secondVerify = await request(app).post("/api/v1/auth/otp/verify").send({ challengeId, code });
      expect(secondVerify.statusCode).toBe(400);
      expect(secondVerify.body.error.code).toBe("OTP_INVALID");
    } finally {
      await prisma.authOtpChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);
});

