import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { env } from "./env.js";

export const helmetMiddleware = helmet();

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
});

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

function otpRateLimitHandler(code: string, message: string) {
  return (req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      error: {
        code,
        message,
      },
      meta: { traceId: req.requestId },
    });
  };
}

export const otpRequestRateLimitMiddleware = rateLimit({
  windowMs: env.AUTH_OTP_REQUEST_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_OTP_REQUEST_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: otpRateLimitHandler("OTP_REQUEST_RATE_LIMITED", "Too many OTP requests. Please try again shortly."),
});

export const otpVerifyRateLimitMiddleware = rateLimit({
  windowMs: env.AUTH_OTP_VERIFY_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_OTP_VERIFY_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: otpRateLimitHandler("OTP_VERIFY_RATE_LIMITED", "Too many OTP verification attempts. Please try again shortly."),
});

