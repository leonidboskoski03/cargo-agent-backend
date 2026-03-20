import { Router } from "express";
import { otpRequestRateLimitMiddleware, otpVerifyRateLimitMiddleware } from "../../config/security.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { ok } from "../../shared/http/apiResponse.js";
import {
  changePassword,
  forgotPassword,
  login,
  loginVerifyOtp,
  listSessions,
  logout,
  logoutAll,
  requestOtp,
  refreshSession,
  register,
  revokeSession,
  resendOtp,
  resetPassword,
  verifyOtp,
} from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  listSessionsSchema,
  loginSchema,
  loginVerifyOtpSchema,
  logoutAllSchema,
  logoutSchema,
  requestOtpSchema,
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
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/login/verify-otp", validate(loginVerifyOtpSchema), loginVerifyOtp);
authRouter.post("/refresh", validate(refreshSessionSchema), refreshSession);
authRouter.post("/logout", validate(logoutSchema), logout);
authRouter.post("/logout-all", requireAuth, validate(logoutAllSchema), logoutAll);
authRouter.get("/sessions", requireAuth, validate(listSessionsSchema), listSessions);
authRouter.delete("/sessions/:sessionId", requireAuth, validate(revokeSessionSchema), revokeSession);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), resetPassword);
authRouter.post("/change-password", requireAuth, validate(changePasswordSchema), changePassword);
authRouter.post("/otp/request", otpRequestRateLimitMiddleware, validate(requestOtpSchema), requestOtp);
authRouter.post("/otp/verify", otpVerifyRateLimitMiddleware, validate(verifyOtpSchema), verifyOtp);
authRouter.post("/otp/resend", validate(resendOtpSchema), resendOtp);

