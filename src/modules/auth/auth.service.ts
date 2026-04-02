import { CompanyType, OtpChannel, OtpPurpose, OtpStatus, PlanCode, RegistrationKind, UserRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { signAccessToken } from "../../shared/auth/jwt.js";
import { hashPassword, verifyPassword } from "../../shared/auth/password.js";
import { createOtpDeliveryProvider } from "./auth.otpDelivery.js";
import { AuthRepository } from "./auth.repository.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";

type LoginInput = {
  email: string;
  password: string;
};

type LoginWithVerifiedOtpInput = {
  email: string;
  password: string;
  otpChallengeId: string;
};

type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  otpChallengeId: string;
};

type RegistrationStartInput = {
  kind: RegistrationKind;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
};

type VerifyRegistrationOtpInput = {
  draftId: string;
  code: string;
};

type CompleteJobSeekerRegistrationInput = {
  draftId: string;
  countryCode: string;
  city: string;
  headline?: string;
  yearsExperience?: number;
  availability?: string;
  preferredRoutes?: string[];
};

type CompleteCompanyRegistrationInput = {
  draftId: string;
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  address: string;
  countryCode: string;
  city: string;
  vatNumber?: string;
  website?: string;
  contactPhone?: string;
  companyEmail?: string;
  planCode: PlanCode;
};

type SessionContext = {
  ipAddress?: string;
  userAgent?: string;
};

type ForgotPasswordInput = {
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

type ResetPasswordInput = {
  otpChallengeId: string;
  newPassword: string;
  ipAddress?: string;
  userAgent?: string;
};

type ChangePasswordInput = {
  userId?: string;
  currentPassword: string;
  newPassword: string;
  currentSessionId?: string;
};

type RequestOtpInput = {
  purpose: OtpPurpose;
  channel: OtpChannel;
  email?: string;
  phone?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
};

type VerifyOtpInput = {
  challengeId: string;
  code: string;
};

type ResendOtpInput = {
  challengeId: string;
};

type ListSessionsInput = {
  userId?: string;
  currentSessionId?: string;
};

type RevokeSessionInput = {
  userId?: string;
  sessionId: string;
};

const repo = new AuthRepository();
const otpDelivery = createOtpDeliveryProvider();
const subscriptionsService = new SubscriptionsService();

function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createRefreshToken() {
  return randomBytes(48).toString("hex");
}

function getRefreshExpiresAt() {
  return new Date(Date.now() + env.JWT_REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);
}

function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.trim();
}

function generateOtpCode() {
  const max = 10 ** env.AUTH_OTP_CODE_LENGTH;
  const num = Math.floor(Math.random() * max);
  return num.toString().padStart(env.AUTH_OTP_CODE_LENGTH, "0");
}

function getOtpExpiresAt() {
  return new Date(Date.now() + env.AUTH_OTP_TTL_MINUTES * 60 * 1000);
}

function getRegistrationDraftExpiresAt() {
  return new Date(Date.now() + env.AUTH_OTP_TTL_MINUTES * 60 * 1000);
}

function getNextResendAt() {
  return new Date(Date.now() + env.AUTH_OTP_RESEND_COOLDOWN_SECONDS * 1000);
}

function shouldRequireLoginMfa(role: UserRole) {
  return env.AUTH_LOGIN_MFA_REQUIRED_ROLES.includes(role);
}

export class AuthService {
  async startRegistration(input: RegistrationStartInput) {
    if (input.kind !== RegistrationKind.JOB_SEEKER && input.kind !== RegistrationKind.COMPANY) {
      throw new AppError(400, "INVALID_REGISTRATION_KIND", "Invalid registration kind");
    }

    const email = normalizeEmail(input.email);
    const phone = input.phone ? normalizePhone(input.phone) : undefined;
    const passwordHash = await hashPassword(input.password);

    const otp = await this.requestOtp({
      purpose: OtpPurpose.REGISTER_VERIFY,
      channel: OtpChannel.EMAIL,
      email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    if (!otp.challengeId) {
      throw new AppError(500, "OTP_CHALLENGE_NOT_CREATED", "Could not create registration OTP challenge");
    }

    const draft = await repo.createRegistrationDraft({
      kind: input.kind,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone,
      passwordHash,
      expiresAt: getRegistrationDraftExpiresAt(),
      otpChallengeId: otp.challengeId,
    });

    return {
      draftId: draft.id,
      challengeId: otp.challengeId,
      expiresAt: otp.expiresAt,
      previewCode: otp.previewCode,
    };
  }

  async verifyRegistrationOtp(input: VerifyRegistrationOtpInput) {
    const draft = await repo.findRegistrationDraftById(input.draftId);

    if (!draft || draft.completedAt) {
      throw new AppError(404, "REGISTRATION_DRAFT_NOT_FOUND", "Registration draft not found");
    }

    if (!draft.otpChallengeId) {
      throw new AppError(400, "OTP_REQUIRED", "Registration OTP challenge not found");
    }

    if (draft.expiresAt.getTime() <= Date.now()) {
      throw new AppError(400, "REGISTRATION_DRAFT_EXPIRED", "Registration draft expired");
    }

    await this.verifyOtp({
      challengeId: draft.otpChallengeId,
      code: input.code,
    });

    const updated = await repo.markRegistrationOtpVerified(draft.id);

    return {
      draftId: updated.id,
      kind: updated.kind,
    };
  }

  async completeJobSeekerRegistration(input: CompleteJobSeekerRegistrationInput, context: SessionContext = {}) {
    const result = await repo.completeJobSeekerRegistration({
      draftId: input.draftId,
      countryCode: input.countryCode.toUpperCase(),
      city: input.city.trim(),
      headline: input.headline?.trim(),
      yearsExperience: input.yearsExperience,
      availability: input.availability?.trim(),
      preferredRoutes: input.preferredRoutes,
    });

    if (!result) {
      throw new AppError(400, "REGISTRATION_DRAFT_INVALID", "Registration draft is invalid or expired");
    }

    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await repo.createSession({
      userId: result.user.id,
      refreshTokenHash,
      tokenVersionSnapshot: result.user.tokenVersion,
      expiresAt: getRefreshExpiresAt(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const accessToken = signAccessToken({
      sub: result.user.id,
      role: result.user.role,
      companyId: undefined,
      email: result.user.email,
      sid: session.id,
      sv: result.user.tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        companyId: result.user.companyId,
      },
    };
  }

  async completeCompanyRegistration(input: CompleteCompanyRegistrationInput, context: SessionContext = {}) {
    const result = await repo.completeCompanyRegistration({
      draftId: input.draftId,
      companyName: input.companyName.trim(),
      companyType: input.companyType,
      registrationNumber: input.registrationNumber.trim(),
      address: input.address.trim(),
      countryCode: input.countryCode.toUpperCase(),
      city: input.city.trim(),
      vatNumber: input.vatNumber?.trim(),
      website: input.website?.trim(),
      companyPhone: input.contactPhone?.trim(),
      companyEmail: input.companyEmail?.trim().toLowerCase(),
      planCode: input.planCode,
    });

    if (!result) {
      throw new AppError(400, "REGISTRATION_DRAFT_INVALID", "Registration draft is invalid or expired");
    }

    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await repo.createSession({
      userId: result.user.id,
      refreshTokenHash,
      tokenVersionSnapshot: result.user.tokenVersion,
      expiresAt: getRefreshExpiresAt(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const accessToken = signAccessToken({
      sub: result.user.id,
      role: result.user.role,
      companyId: result.user.companyId ?? undefined,
      email: result.user.email,
      sid: session.id,
      sv: result.user.tokenVersion,
    });

    let checkout: { provider: string; planCode: PlanCode; checkoutSessionId: string; checkoutUrl: string | null; status: string } | null = null;

    if (input.planCode === PlanCode.PRO) {
      const createdCheckout = await subscriptionsService.createCheckoutSession({
        companyId: result.company.id,
        planCode: PlanCode.PRO,
      });

      checkout = {
        provider: createdCheckout.provider,
        planCode: createdCheckout.planCode,
        checkoutSessionId: createdCheckout.checkoutSessionId,
        checkoutUrl: createdCheckout.checkoutUrl ?? null,
        status: createdCheckout.status,
      };
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        companyId: result.user.companyId,
      },
      company: result.company,
      checkout,
    };
  }

  async login(input: LoginInput, context: SessionContext = {}) {
    const email = input.email.trim().toLowerCase();
    const user = await repo.findActiveUserByEmail(email);

    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (shouldRequireLoginMfa(user.role)) {
      const challenge = await this.requestOtp({
        purpose: OtpPurpose.LOGIN_MFA,
        channel: OtpChannel.EMAIL,
        email: user.email,
        userId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        mfaRequired: true,
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        code: challenge.previewCode,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
        },
      };
    }

    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await repo.createSession({
      userId: user.id,
      refreshTokenHash,
      tokenVersionSnapshot: user.tokenVersion,
      expiresAt: getRefreshExpiresAt(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: user.companyId ?? undefined,
      email: user.email,
      sid: session.id,
      sv: user.tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async loginWithVerifiedOtp(input: LoginWithVerifiedOtpInput, context: SessionContext = {}) {
    const email = normalizeEmail(input.email);
    const user = await repo.findActiveUserByEmail(email);

    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isOtpConsumed = await repo.consumeVerifiedOtpChallenge({
      challengeId: input.otpChallengeId,
      purpose: OtpPurpose.LOGIN_MFA,
      destination: email,
      channel: OtpChannel.EMAIL,
    });

    if (!isOtpConsumed) {
      throw new AppError(400, "OTP_REQUIRED", "A verified login OTP is required");
    }

    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await repo.createSession({
      userId: user.id,
      refreshTokenHash,
      tokenVersionSnapshot: user.tokenVersion,
      expiresAt: getRefreshExpiresAt(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: user.companyId ?? undefined,
      email: user.email,
      sid: session.id,
      sv: user.tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async register(input: RegisterInput, context: SessionContext = {}) {
    if (input.role !== UserRole.JOB_SEEKER) {
      throw new AppError(400, "INVALID_REGISTRATION_ROLE", "Only JOB_SEEKER self-registration is supported");
    }

    const email = input.email.trim().toLowerCase();
    const isOtpConsumed = await repo.consumeVerifiedOtpChallenge({
      challengeId: input.otpChallengeId,
      purpose: OtpPurpose.REGISTER_VERIFY,
      destination: email,
      channel: OtpChannel.EMAIL,
    });

    if (!isOtpConsumed) {
      throw new AppError(400, "OTP_REQUIRED", "A verified registration OTP is required");
    }

    const passwordHash = await hashPassword(input.password);

    try {
      const user = await repo.createUser({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        passwordHash,
        role: UserRole.JOB_SEEKER,
      });

      const refreshToken = createRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const session = await repo.createSession({
        userId: user.id,
        refreshTokenHash,
        tokenVersionSnapshot: user.tokenVersion,
        expiresAt: getRefreshExpiresAt(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        companyId: undefined,
        email: user.email,
        sid: session.id,
        sv: user.tokenVersion,
      });

      return {
        accessToken,
        refreshToken,
        user,
      };
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "EMAIL_ALREADY_IN_USE", "A user with this email already exists");
      }

      throw error;
    }
  }

  async refresh(input: { refreshToken: string; ipAddress?: string; userAgent?: string }) {
    const refreshTokenHash = hashRefreshToken(input.refreshToken);
    const session = await repo.findActiveSessionByRefreshHash(refreshTokenHash);

    if (!session) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired session");
    }

    const user = await repo.findActiveUserById(session.userId);
    if (!user) {
      await repo.revokeSessionById(session.id, "USER_NOT_FOUND_OR_INACTIVE");
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired session");
    }

    if (user.tokenVersion !== session.tokenVersionSnapshot) {
      await repo.revokeSessionById(session.id, "TOKEN_VERSION_MISMATCH");
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Session is no longer valid");
    }

    const newRefreshToken = createRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    await repo.rotateSessionRefreshToken({
      sessionId: session.id,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: getRefreshExpiresAt(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: user.companyId ?? undefined,
      email: user.email,
      sid: session.id,
      sv: user.tokenVersion,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logoutCurrent(refreshToken?: string) {
    if (refreshToken) {
      await repo.revokeSessionByRefreshHash(hashRefreshToken(refreshToken), "LOGOUT_CURRENT");
    }

    return { success: true };
  }

  async logoutAll(input: { userId?: string }) {
    if (!input.userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    await repo.revokeAllSessionsForUser(input.userId, "LOGOUT_ALL");
    await repo.incrementTokenVersion(input.userId);

    return { success: true };
  }

  async listSessions(input: ListSessionsInput) {
    if (!input.userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const sessions = await repo.listActiveSessionsForUser(input.userId);

    return {
      sessions: sessions.map((session) => ({
        ...session,
        isCurrent: Boolean(input.currentSessionId && session.id === input.currentSessionId),
      })),
    };
  }

  async revokeSession(input: RevokeSessionInput) {
    if (!input.userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const result = await repo.revokeSessionForUser({
      userId: input.userId,
      sessionId: input.sessionId,
      reason: "USER_REVOKED_SESSION",
    });

    if (result.count === 0) {
      throw new AppError(404, "SESSION_NOT_FOUND", "Session not found");
    }

    return {
      success: true,
      revokedSessionId: input.sessionId,
    };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    return this.requestOtp({
      purpose: OtpPurpose.FORGOT_PASSWORD,
      channel: OtpChannel.EMAIL,
      email: input.email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }

  async resetPassword(input: ResetPasswordInput) {
    const challenge = await repo.findOtpChallengeById(input.otpChallengeId);

    if (!challenge || challenge.status !== OtpStatus.VERIFIED || challenge.purpose !== OtpPurpose.FORGOT_PASSWORD || challenge.expiresAt.getTime() <= Date.now()) {
      throw new AppError(400, "OTP_REQUIRED", "A verified forgot-password OTP is required");
    }

    if (env.AUTH_RESET_PASSWORD_BIND_IP && challenge.requestedIp && input.ipAddress && challenge.requestedIp !== input.ipAddress) {
      throw new AppError(400, "OTP_CONTEXT_MISMATCH", "OTP challenge context does not match this request");
    }

    if (
      env.AUTH_RESET_PASSWORD_BIND_USER_AGENT &&
      challenge.requestedAgent &&
      input.userAgent &&
      challenge.requestedAgent !== input.userAgent
    ) {
      throw new AppError(400, "OTP_CONTEXT_MISMATCH", "OTP challenge context does not match this request");
    }

    if (!challenge.userId) {
      throw new AppError(400, "OTP_INVALID", "OTP challenge is not linked to a user");
    }

    const wasConsumed = await repo.consumeVerifiedOtpChallenge({
      challengeId: challenge.id,
      purpose: OtpPurpose.FORGOT_PASSWORD,
      userId: challenge.userId,
      destination: challenge.destination,
      channel: challenge.channel,
    });

    if (!wasConsumed) {
      throw new AppError(400, "OTP_REQUIRED", "A verified forgot-password OTP is required");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await repo.changePasswordAndRevokeSessions({
      userId: challenge.userId,
      passwordHash,
      reason: "PASSWORD_RESET",
    });

    return { success: true };
  }

  async changePassword(input: ChangePasswordInput) {
    if (!input.userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const user = await repo.findAuthUserById(input.userId);

    if (!user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const isCurrentPasswordValid = await verifyPassword(input.currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
    }

    const passwordHash = await hashPassword(input.newPassword);

    await repo.changePasswordAndRevokeSessions({
      userId: user.id,
      passwordHash,
      keepSessionId: input.currentSessionId,
      reason: "PASSWORD_CHANGED",
    });

    return { success: true };
  }

  async requestOtp(input: RequestOtpInput) {
    let destination = input.channel === OtpChannel.EMAIL ? input.email : input.phone;
    let userId = input.userId;

    if (input.purpose === OtpPurpose.INVITE_ACCEPT) {
      if (input.channel !== OtpChannel.EMAIL || !input.userId) {
        throw new AppError(400, "OTP_INVALID_CONTEXT", "Invite accept OTP requires authenticated email channel");
      }

      const authUser = await repo.findAuthUserById(input.userId);
      if (!authUser) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
      }

      userId = authUser.id;
      destination = normalizeEmail(authUser.email);
    }

    if (input.channel === OtpChannel.EMAIL && destination) {
      destination = normalizeEmail(destination);
    }
    if (input.channel === OtpChannel.SMS && destination) {
      destination = normalizePhone(destination);
    }

    if (input.purpose === OtpPurpose.FORGOT_PASSWORD) {
      if (!destination) {
        throw new AppError(400, "OTP_DESTINATION_REQUIRED", "Email or phone is required for forgot password OTP");
      }

      const user =
        input.channel === OtpChannel.EMAIL
          ? await repo.findActiveUserByEmail(destination)
          : await repo.findActiveUserByPhone(destination);

      if (!user?.isActive) {
        return { accepted: true };
      }

      userId = user.id;
    }

    if (!destination) {
      if (!input.userId) {
        throw new AppError(400, "OTP_DESTINATION_REQUIRED", "Email or phone destination is required");
      }

      const authUser = await repo.findAuthUserById(input.userId);
      if (!authUser) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
      }
      if (input.channel === OtpChannel.EMAIL) {
        destination = normalizeEmail(authUser.email);
      }
    }

    if (!destination) {
      throw new AppError(400, "OTP_DESTINATION_REQUIRED", "Email or phone destination is required");
    }

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);

    await repo.cancelPendingOtpChallenges({
      destination,
      purpose: input.purpose,
      channel: input.channel,
    });

    const delivery = await otpDelivery.sendOtp({
      channel: input.channel,
      destination,
      code,
      purpose: input.purpose,
    });

    const challenge = await repo.createOtpChallenge({
      userId,
      channel: input.channel,
      purpose: input.purpose,
      destination,
      codeHash,
      maxAttempts: env.AUTH_OTP_MAX_ATTEMPTS,
      nextResendAt: getNextResendAt(),
      expiresAt: getOtpExpiresAt(),
      requestedIp: input.ipAddress,
      requestedAgent: input.userAgent,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
    });

    return {
      accepted: true,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      previewCode: delivery.previewCode,
    };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const challenge = await repo.findOtpChallengeById(input.challengeId);

    if (!challenge || challenge.status !== OtpStatus.PENDING) {
      throw new AppError(400, "OTP_INVALID", "Invalid OTP challenge");
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await repo.markOtpExpired(challenge.id);
      throw new AppError(400, "OTP_EXPIRED", "OTP challenge expired");
    }

    const isValid = hashOtpCode(input.code) === challenge.codeHash;
    if (!isValid) {
      const nextAttemptCount = challenge.attemptCount + 1;
      await repo.markOtpAttempt(challenge.id, nextAttemptCount >= challenge.maxAttempts ? OtpStatus.LOCKED : undefined);

      if (nextAttemptCount >= challenge.maxAttempts) {
        throw new AppError(429, "OTP_ATTEMPTS_EXCEEDED", "Too many invalid OTP attempts");
      }

      throw new AppError(400, "OTP_INVALID", "Invalid OTP code");
    }

    await repo.markOtpVerified(challenge.id);

    if (challenge.userId && (challenge.purpose === OtpPurpose.REGISTER_VERIFY || challenge.purpose === OtpPurpose.INVITE_ACCEPT)) {
      await repo.markUserContactVerified({
        userId: challenge.userId,
        channel: challenge.channel,
      });
    }

    return {
      success: true,
      challengeId: challenge.id,
      purpose: challenge.purpose,
      channel: challenge.channel,
    };
  }

  async resendOtp(input: ResendOtpInput) {
    const challenge = await repo.findOtpChallengeById(input.challengeId);

    if (!challenge || challenge.status !== OtpStatus.PENDING) {
      throw new AppError(400, "OTP_INVALID", "Invalid OTP challenge");
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await repo.markOtpExpired(challenge.id);
      throw new AppError(400, "OTP_EXPIRED", "OTP challenge expired");
    }

    if (challenge.nextResendAt && challenge.nextResendAt.getTime() > Date.now()) {
      throw new AppError(429, "OTP_RESEND_COOLDOWN", "Please wait before requesting another OTP");
    }

    const code = generateOtpCode();
    const delivery = await otpDelivery.sendOtp({
      channel: challenge.channel,
      destination: challenge.destination,
      code,
      purpose: challenge.purpose,
    });

    const updated = await repo.rotateOtpCode({
      challengeId: challenge.id,
      codeHash: hashOtpCode(code),
      expiresAt: getOtpExpiresAt(),
      nextResendAt: getNextResendAt(),
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
    });

    return {
      accepted: true,
      challengeId: updated.id,
      expiresAt: updated.expiresAt,
      previewCode: delivery.previewCode,
    };
  }
}

