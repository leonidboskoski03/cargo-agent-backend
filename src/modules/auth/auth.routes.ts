import { Router } from "express";
import { otpRequestRateLimitMiddleware, otpVerifyRateLimitMiddleware } from "../../config/security.js";
import { optionalAuth, requireActiveSession, requireAuth } from "../../shared/middleware/auth.middleware.js";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { ok } from "../../shared/http/apiResponse.js";
import {
  changePassword,
  completeCompanyRegistration,
  completeJobSeekerRegistration,
  forgotPassword,
  login,
  loginVerifyOtp,
  listSessions,
  logout,
  logoutAll,
  requestOtp,
  startRegistration,
  refreshSession,
  register,
  revokeSession,
  resendOtp,
  resetPassword,
  verifyRegistrationOtp,
  verifyOtp,
} from "./auth.controller.js";
import {
  changePasswordSchema,
  completeCompanyRegistrationSchema,
  completeJobSeekerRegistrationSchema,
  forgotPasswordSchema,
  listSessionsSchema,
  loginSchema,
  loginVerifyOtpSchema,
  logoutAllSchema,
  logoutSchema,
  requestOtpSchema,
  registrationStartSchema,
  registrationVerifyOtpSchema,
  refreshSessionSchema,
  registerSchema,
  revokeSessionSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.validator.js";

export const authRouter = Router();

authRouter.get("/", (_req, res) => ok(res, { module: "auth", status: "ready" }));
authRouter.post("/register", validate(registerSchema), asyncRoute(register));
authRouter.post("/registration/start", validate(registrationStartSchema), asyncRoute(startRegistration));
authRouter.post("/registration/verify-otp", validate(registrationVerifyOtpSchema), asyncRoute(verifyRegistrationOtp));
authRouter.post("/registration/complete-job-seeker", validate(completeJobSeekerRegistrationSchema), asyncRoute(completeJobSeekerRegistration));
authRouter.post("/registration/complete-company", validate(completeCompanyRegistrationSchema), asyncRoute(completeCompanyRegistration));
authRouter.post("/login", validate(loginSchema), asyncRoute(login));
authRouter.post("/login/verify-otp", validate(loginVerifyOtpSchema), asyncRoute(loginVerifyOtp));
authRouter.post("/refresh", validate(refreshSessionSchema), asyncRoute(refreshSession));
authRouter.post("/logout", validate(logoutSchema), asyncRoute(logout));
authRouter.post("/logout-all", requireAuth, requireActiveSession, validate(logoutAllSchema), asyncRoute(logoutAll));
authRouter.get("/sessions", requireAuth, requireActiveSession, validate(listSessionsSchema), asyncRoute(listSessions));
authRouter.delete("/sessions/:sessionId", requireAuth, requireActiveSession, validate(revokeSessionSchema), asyncRoute(revokeSession));
authRouter.post("/forgot-password", validate(forgotPasswordSchema), asyncRoute(forgotPassword));
authRouter.post("/reset-password", validate(resetPasswordSchema), asyncRoute(resetPassword));
authRouter.post("/change-password", requireAuth, requireActiveSession, validate(changePasswordSchema), asyncRoute(changePassword));
authRouter.post("/otp/request", optionalAuth, otpRequestRateLimitMiddleware, validate(requestOtpSchema), asyncRoute(requestOtp));
authRouter.post("/otp/verify", otpVerifyRateLimitMiddleware, validate(verifyOtpSchema), asyncRoute(verifyOtp));
authRouter.post("/otp/resend", validate(resendOtpSchema), asyncRoute(resendOtp));

