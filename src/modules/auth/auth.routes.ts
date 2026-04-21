import { Router } from "express";
import { otpRequestRateLimitMiddleware, otpVerifyRateLimitMiddleware } from "../../config/security.js";
import { optionalAuth, requireActiveSession, requireAuth } from "../../shared/middleware/auth.middleware.js";
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
authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/registration/start", validate(registrationStartSchema), startRegistration);
authRouter.post("/registration/verify-otp", validate(registrationVerifyOtpSchema), verifyRegistrationOtp);
authRouter.post("/registration/complete-job-seeker", validate(completeJobSeekerRegistrationSchema), completeJobSeekerRegistration);
authRouter.post("/registration/complete-company", validate(completeCompanyRegistrationSchema), completeCompanyRegistration);
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/login/verify-otp", validate(loginVerifyOtpSchema), loginVerifyOtp);
authRouter.post("/refresh", validate(refreshSessionSchema), refreshSession);
authRouter.post("/logout", validate(logoutSchema), logout);
authRouter.post("/logout-all", requireAuth, requireActiveSession, validate(logoutAllSchema), logoutAll);
authRouter.get("/sessions", requireAuth, requireActiveSession, validate(listSessionsSchema), listSessions);
authRouter.delete("/sessions/:sessionId", requireAuth, requireActiveSession, validate(revokeSessionSchema), revokeSession);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), resetPassword);
authRouter.post("/change-password", requireAuth, requireActiveSession, validate(changePasswordSchema), changePassword);
authRouter.post("/otp/request", optionalAuth, otpRequestRateLimitMiddleware, validate(requestOtpSchema), requestOtp);
authRouter.post("/otp/verify", otpVerifyRateLimitMiddleware, validate(verifyOtpSchema), verifyOtp);
authRouter.post("/otp/resend", validate(resendOtpSchema), resendOtp);

