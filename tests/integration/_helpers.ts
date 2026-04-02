import type { PrismaClient, UserRole } from "@prisma/client";

type Runtime = {
  prisma: PrismaClient;
  buildApp: () => import("express").Express;
  signAccessToken: (payload: {
    sub: string;
    role?: UserRole;
    companyId?: string;
    email?: string;
    sid?: string;
    sv?: number;
  }) => string;
};

export function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.PORT = "4001";
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/cargo_agent_test";
  process.env.JWT_ACCESS_SECRET = "1234567890123456";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.JWT_COOKIE_NAME = "ca_access_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.LOG_LEVEL = "silent";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  process.env.RATE_LIMIT_MAX = "100";
  process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = "60000";
  process.env.AUTH_LOGIN_RATE_LIMIT_MAX = "100";
  process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS = "60000";
  process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX = "100";
  process.env.AUTH_RESET_PASSWORD_RATE_LIMIT_WINDOW_MS = "60000";
  process.env.AUTH_RESET_PASSWORD_RATE_LIMIT_MAX = "100";
  process.env.AUTH_STRICT_SESSION_CHECK_ENABLED = "false";
  process.env.AUTH_RESET_PASSWORD_BIND_IP = "false";
  process.env.AUTH_RESET_PASSWORD_BIND_USER_AGENT = "false";
  process.env.AUTH_LOGIN_MFA_REQUIRED_ROLES = "COMPANY_ADMIN";
  process.env.JOB_SEEKER_FREE_APPLICATIONS_PER_MONTH = "10";
  process.env.JOB_SEEKER_FREE_ACTIVE_LISTINGS = "1";
  process.env.JOB_SEEKER_APPLICATION_CREDIT_COST = "1";
  process.env.JOB_SEEKER_LISTING_PROMOTION_CREDIT_COST = "2";
  process.env.JOB_SEEKER_SUBMISSION_PROMOTION_CREDIT_COST = "1";
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  process.env.BULLMQ_ENABLED = "false";
  process.env.CRON_ENABLED = "false";
}

export async function initRuntime(): Promise<Runtime> {
  setTestEnv();

  const [{ buildApp }, { prisma }, { signAccessToken }] = await Promise.all([
    import("../../src/app.js"),
    import("../../src/shared/prisma/prismaClient.js"),
    import("../../src/shared/auth/jwt.js"),
  ]);

  return {
    prisma,
    buildApp,
    signAccessToken,
  };
}

export async function isDatabaseAvailable(prisma: PrismaClient) {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export function authHeader(
  signAccessToken: Runtime["signAccessToken"],
  input: { userId: string; role: UserRole; companyId?: string; email: string },
) {
  const token = signAccessToken({
    sub: input.userId,
    role: input.role,
    companyId: input.companyId,
    email: input.email,
  });

  return `Bearer ${token}`;
}
