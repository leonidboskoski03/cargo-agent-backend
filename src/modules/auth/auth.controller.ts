import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { clearAccessCookie, clearRefreshCookie, setAccessCookie, setRefreshCookie } from "../../shared/auth/cookies.js";
import { ok } from "../../shared/http/apiResponse.js";
import { AuthService } from "./auth.service.js";

const service = new AuthService();

export async function login(req: Request, res: Response) {
  const data = await service.login({
    email: req.body.email,
    password: req.body.password,
  }, {
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  if ("mfaRequired" in data && data.mfaRequired) {
    clearAccessCookie(res);
    clearRefreshCookie(res);

    return ok(res, {
      user: data.user,
      challengeId: data.challengeId,
      expiresAt: data.expiresAt,
      code: data.code,
      nextAction: {
        type: "MFA_REQUIRED",
        purpose: "LOGIN_MFA",
      },
    });
  }

  const accessToken = data.accessToken;
  const refreshToken = data.refreshToken;

  if (!accessToken || !refreshToken) {
    clearAccessCookie(res);
    clearRefreshCookie(res);
    return ok(res, { message: "Login could not be completed" });
  }

  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);

  return ok(res, {
    user: data.user,
  });
}

export async function loginVerifyOtp(req: Request, res: Response) {
  const data = await service.loginWithVerifiedOtp({
    email: req.body.email,
    password: req.body.password,
    otpChallengeId: req.body.otpChallengeId,
  }, {
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  setAccessCookie(res, data.accessToken);
  setRefreshCookie(res, data.refreshToken);

  return ok(res, {
    user: data.user,
  });
}

export async function register(req: Request, res: Response) {
  const data = await service.register({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    otpChallengeId: req.body.otpChallengeId,
  }, {
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  setAccessCookie(res, data.accessToken);
  setRefreshCookie(res, data.refreshToken);

  return ok(res, {
    user: data.user,
    nextAction: {
      type: "AUTHENTICATED",
      message: "Registration completed",
    },
  });
}

export async function startRegistration(req: Request, res: Response) {
  const data = await service.startRegistration({
    kind: req.body.kind,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  return ok(res, {
    draftId: data.draftId,
    challengeId: data.challengeId,
    expiresAt: data.expiresAt,
    code: data.previewCode,
    nextAction: {
      type: "VERIFY_OTP",
      purpose: "REGISTER_VERIFY",
    },
  });
}

export async function verifyRegistrationOtp(req: Request, res: Response) {
  const data = await service.verifyRegistrationOtp({
    draftId: req.body.draftId,
    code: req.body.code,
  });

  return ok(res, {
    draftId: data.draftId,
    kind: data.kind,
    otpVerified: true,
    nextAction: {
      type: data.kind === "COMPANY" ? "COMPLETE_COMPANY_PROFILE" : "COMPLETE_JOB_SEEKER_PROFILE",
    },
  });
}

export async function completeJobSeekerRegistration(req: Request, res: Response) {
  const data = await service.completeJobSeekerRegistration({
    draftId: req.body.draftId,
    countryCode: req.body.countryCode,
    city: req.body.city,
    headline: req.body.headline,
    yearsExperience: req.body.yearsExperience,
    availability: req.body.availability,
    preferredRoutes: req.body.preferredRoutes,
  }, {
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  setAccessCookie(res, data.accessToken);
  setRefreshCookie(res, data.refreshToken);

  return ok(res, {
    user: data.user,
    nextAction: {
      type: "AUTHENTICATED",
      message: "Job seeker registration completed",
    },
  });
}

export async function completeCompanyRegistration(req: Request, res: Response) {
  const data = await service.completeCompanyRegistration({
    draftId: req.body.draftId,
    companyName: req.body.companyName,
    companyType: req.body.companyType,
    registrationNumber: req.body.registrationNumber,
    address: req.body.address,
    countryCode: req.body.countryCode,
    city: req.body.city,
    vatNumber: req.body.vatNumber,
    website: req.body.website,
    contactPhone: req.body.contactPhone,
    companyEmail: req.body.companyEmail,
    planCode: req.body.planCode,
  }, {
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  setAccessCookie(res, data.accessToken);
  setRefreshCookie(res, data.refreshToken);

  return ok(res, {
    user: data.user,
    company: data.company,
    checkout: data.checkout ?? null,
    nextAction: data.checkout
      ? { type: "COMPANY_PRO_CHECKOUT_REQUIRED" }
      : { type: "AUTHENTICATED", message: "Company registration completed" },
  });
}

export async function refreshSession(req: Request, res: Response) {
  const refreshToken = req.cookies?.[env.JWT_REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    clearAccessCookie(res);
    clearRefreshCookie(res);
    return ok(res, { message: "No active session" });
  }

  const data = await service.refresh({
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  setAccessCookie(res, data.accessToken);
  setRefreshCookie(res, data.refreshToken);

  return ok(res, { message: "Session refreshed" });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[env.JWT_REFRESH_COOKIE_NAME];
  await service.logoutCurrent(refreshToken);

  clearAccessCookie(res);
  clearRefreshCookie(res);

  return ok(res, {
    message: "Logged out",
  });
}

export async function logoutAll(req: Request, res: Response) {
  await service.logoutAll({
    userId: req.auth?.sub,
  });

  clearAccessCookie(res);
  clearRefreshCookie(res);

  return ok(res, {
    message: "Logged out from all sessions",
  });
}

export async function listSessions(req: Request, res: Response) {
  const data = await service.listSessions({
    userId: req.auth?.sub,
    currentSessionId: typeof req.auth?.sid === "string" ? req.auth.sid : undefined,
  });

  return ok(res, {
    sessions: data.sessions,
  });
}

export async function revokeSession(req: Request, res: Response) {
  const sessionId = typeof req.params.sessionId === "string" ? req.params.sessionId : "";
  const currentSessionId = typeof req.auth?.sid === "string" ? req.auth.sid : undefined;

  const data = await service.revokeSession({
    userId: req.auth?.sub,
    sessionId,
  });

  if (currentSessionId && sessionId === currentSessionId) {
    clearAccessCookie(res);
    clearRefreshCookie(res);
  }

  return ok(res, {
    message: "Session revoked",
    revokedSessionId: data.revokedSessionId,
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const data = await service.forgotPassword({
    email: req.body.email,
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  return ok(res, {
    message: "If the account exists, an OTP challenge has been generated",
    challengeId: data.challengeId,
    expiresAt: data.expiresAt,
    code: data.previewCode,
    nextAction: {
      type: "VERIFY_OTP",
      purpose: "FORGOT_PASSWORD",
    },
  });
}

export async function resetPassword(req: Request, res: Response) {
  await service.resetPassword({
    otpChallengeId: req.body.otpChallengeId,
    newPassword: req.body.newPassword,
  });

  clearAccessCookie(res);
  clearRefreshCookie(res);

  return ok(res, {
    message: "Password reset successful. Please log in again",
    nextAction: {
      type: "LOGIN",
    },
  });
}

export async function changePassword(req: Request, res: Response) {
  await service.changePassword({
    userId: req.auth?.sub,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    currentSessionId: typeof req.auth?.sid === "string" ? req.auth.sid : undefined,
  });

  clearAccessCookie(res);
  clearRefreshCookie(res);

  return ok(res, {
    message: "Password changed. Please log in again",
  });
}

export async function requestOtp(req: Request, res: Response) {
  const data = await service.requestOtp({
    purpose: req.body.purpose,
    channel: req.body.channel,
    email: req.body.email,
    phone: req.body.phone,
    userId: req.auth?.sub,
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });

  return ok(res, {
    accepted: true,
    challengeId: data.challengeId,
    expiresAt: data.expiresAt,
    code: data.previewCode,
    nextAction: {
      type: "ENTER_OTP",
      purpose: req.body.purpose,
    },
  });
}

export async function verifyOtp(req: Request, res: Response) {
  const data = await service.verifyOtp({
    challengeId: req.body.challengeId,
    code: req.body.code,
  });

  const purposeNextActionMap: Record<string, { type: string }> = {
    REGISTER_VERIFY: { type: "COMPLETE_REGISTRATION" },
    FORGOT_PASSWORD: { type: "RESET_PASSWORD" },
    INVITE_ACCEPT: { type: "ACCEPT_INVITE" },
    CHANGE_PASSWORD: { type: "CONFIRM_PASSWORD_CHANGE" },
    LOGIN_MFA: { type: "COMPLETE_LOGIN" },
  };

  return ok(res, {
    ...data,
    nextAction: purposeNextActionMap[data.purpose] ?? { type: "CONTINUE" },
  });
}

export async function resendOtp(req: Request, res: Response) {
  const data = await service.resendOtp({
    challengeId: req.body.challengeId,
  });

  return ok(res, {
    accepted: true,
    challengeId: data.challengeId,
    expiresAt: data.expiresAt,
    code: data.previewCode,
    nextAction: {
      type: "ENTER_OTP",
    },
  });
}

