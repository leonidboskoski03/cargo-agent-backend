import dotenv from "dotenv";
import { z } from "zod";
import { UserRole } from "@prisma/client";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_COOKIE_NAME: z.string().default("ca_access_token"),
  JWT_REFRESH_SECRET: z.string().min(16).default("change-me-refresh-secret-123"),
  JWT_REFRESH_COOKIE_NAME: z.string().default("ca_refresh_token"),
  JWT_REFRESH_SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  BULLMQ_ENABLED: z
    .string()
    .default("true")
    .transform((value) => value.toLowerCase() === "true"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_CHECKOUT_SUCCESS_URL: z.string().url().default("http://localhost:3000/billing/success"),
  STRIPE_CHECKOUT_CANCEL_URL: z.string().url().default("http://localhost:3000/billing/cancel"),
  BILLING_PORTAL_RETURN_URL: z.string().url().default("http://localhost:3000/settings/billing"),
  JOB_SEEKER_FREE_APPLICATIONS_PER_MONTH: z.coerce.number().int().min(0).default(10),
  JOB_SEEKER_FREE_ACTIVE_LISTINGS: z.coerce.number().int().min(0).default(1),
  JOB_SEEKER_APPLICATION_CREDIT_COST: z.coerce.number().int().min(1).default(1),
  JOB_SEEKER_LISTING_PROMOTION_CREDIT_COST: z.coerce.number().int().min(1).default(2),
  JOB_SEEKER_SUBMISSION_PROMOTION_CREDIT_COST: z.coerce.number().int().min(1).default(1),
  INTERNAL_ADMIN_ADJUSTMENTS_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  INVITE_ACCEPT_URL_BASE: z.string().url().default("http://localhost:3000/invites/accept"),
  AUTH_OTP_PROVIDER: z.enum(["simulated", "twilio_simulated"]).default("simulated"),
  AUTH_LOGIN_MFA_REQUIRED_ROLES: z
    .string()
    .default("COMPANY_ADMIN")
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part): part is UserRole => Object.values(UserRole).includes(part as UserRole)),
    ),
  AUTH_OTP_CODE_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  AUTH_OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(30).default(10),
  AUTH_OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  AUTH_OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(10).max(300).default(60),
  AUTH_OTP_PREVIEW_IN_NON_PROD: z
    .string()
    .default("true")
    .transform((value) => value.toLowerCase() === "true"),
  AUTH_OTP_REQUEST_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  AUTH_OTP_REQUEST_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(12),
  AUTH_OTP_VERIFY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  AUTH_OTP_VERIFY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(30),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  AUTH_FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  AUTH_RESET_PASSWORD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  AUTH_RESET_PASSWORD_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  AUTH_STRICT_SESSION_CHECK_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  AUTH_RESET_PASSWORD_BIND_IP: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  AUTH_RESET_PASSWORD_BIND_USER_AGENT: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  CRON_ENABLED: z
    .string()
    .default("true")
    .transform((value) => value.toLowerCase() === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
