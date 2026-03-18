import request from "supertest";
import { describe, expect, it } from "vitest";

describe("health endpoints", () => {
  it("returns live status", async () => {
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
    process.env.CRON_ENABLED = "false";

    const { buildApp } = await import("../../src/app.js");
    const app = buildApp();

    const response = await request(app).get("/health/live");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("live");
  });
});

