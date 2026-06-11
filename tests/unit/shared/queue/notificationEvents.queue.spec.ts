import { beforeEach, describe, expect, it, vi } from "vitest";

const addMock = vi.fn();
const queueConstructorMock = vi.fn(() => ({
  add: addMock,
}));

vi.mock("bullmq", () => ({
  Queue: queueConstructorMock,
}));

function setBaseEnv() {
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
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
}

describe("enqueueNotificationEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setBaseEnv();
  });

  it("returns null and does not initialize queue when BullMQ is disabled", async () => {
    process.env.BULLMQ_ENABLED = "false";
    const { enqueueNotificationEvent } = await import("../../../../src/shared/queue/notificationEvents.queue.js");

    const result = await enqueueNotificationEvent({ type: "BID_ACCEPTED", bidId: "bid_1" });

    expect(result).toBeNull();
    expect(queueConstructorMock).not.toHaveBeenCalled();
  });

  it("enqueues bid accepted event with deterministic jobId", async () => {
    process.env.BULLMQ_ENABLED = "true";
    addMock.mockResolvedValue({ id: "job_1" });
    const { enqueueNotificationEvent } = await import("../../../../src/shared/queue/notificationEvents.queue.js");

    await enqueueNotificationEvent({ type: "BID_ACCEPTED", bidId: "bid_1" });

    expect(queueConstructorMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith(
      "BID_ACCEPTED",
      { type: "BID_ACCEPTED", bidId: "bid_1" },
      { jobId: "bid_accepted__bid_1" },
    );
  });
});

