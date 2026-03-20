import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

describe("Auth guards", () => {
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

  it("requires auth for notifications list", async () => {
    const { buildApp } = await import("../../src/app.js");
    const app = buildApp();

    const response = await request(app).get("/api/v1/notifications");

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires auth for documents list", async () => {
    const { buildApp } = await import("../../src/app.js");
    const app = buildApp();

    const response = await request(app).get("/api/v1/documents");

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires auth for audit log listing", async () => {
    const { buildApp } = await import("../../src/app.js");
    const app = buildApp();

    const response = await request(app).get("/api/v1/audit-logs");

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
}, 20_000);

