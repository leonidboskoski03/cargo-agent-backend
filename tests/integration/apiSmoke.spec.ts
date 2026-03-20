  import request from "supertest";
    import { beforeAll, describe, expect, it } from "vitest";
    import { initRuntime, isDatabaseAvailable } from "./_helpers.js";

const moduleBasePaths = [
  "/api/v1/auth",
  "/api/v1/companies",
  "/api/v1/users",
  "/api/v1/licenses",
  "/api/v1/vehicles",
  "/api/v1/vehicle-assignments",
  "/api/v1/locations",
  "/api/v1/routes",
  "/api/v1/posts",
  "/api/v1/bids",
  "/api/v1/contracts",
  "/api/v1/reviews",
  "/api/v1/documents",
  "/api/v1/notifications",
  "/api/v1/audit-logs",
  "/api/v1/plans",
  "/api/v1/subscriptions",
  "/api/v1/billing",
  "/api/v1/job-applications",
  "/api/v1/job-seeker-billing",
  "/api/v1/company-invites",
] as const;

describe("API smoke", () => {
  let dbReady = false;

  beforeAll(() => {
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
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
    process.env.BULLMQ_ENABLED = "false";
    process.env.CRON_ENABLED = "false";
  });

  beforeAll(async () => {
    const { prisma } = await initRuntime();
    dbReady = await isDatabaseAvailable(prisma);
  });

  it.each(moduleBasePaths)("GET %s does not return 500", async (path) => {
    if (!dbReady && path === "/api/v1/plans") {
      return;
    }

    const { buildApp } = await import("../../src/app.js");
    const app = buildApp();

    const response = await request(app).get(path);

    expect(response.statusCode).not.toBeGreaterThanOrEqual(500);
    expect(response.body.success).toBeTypeOf("boolean");
  });
}, 20_000);

