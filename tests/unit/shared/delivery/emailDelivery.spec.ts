import { describe, expect, it, vi } from "vitest";

const baseEnv = {
  AUTH_OTP_PREVIEW_IN_NON_PROD: true,
  AUTH_OTP_PROVIDER: "simulated",
  EMAIL_FROM: "Cargo Agent <no-reply@cargo-agent.local>",
  EMAIL_PROVIDER: "simulated",
  INVITE_ACCEPT_URL_BASE: "http://localhost:3000/invites/accept",
  NODE_ENV: "test",
  RESEND_API_KEY: undefined,
};

async function loadDelivery(envOverrides: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("../../../../src/config/env.js", () => ({
    env: {
      ...baseEnv,
      ...envOverrides,
    },
  }));
  vi.doMock("../../../../src/config/logger.js", () => ({
    logger: {
      error: vi.fn(),
      info: vi.fn(),
    },
  }));

  return import("../../../../src/shared/delivery/emailDelivery.js");
}

describe("emailDelivery", () => {
  it("reports provider delivery as configured only when required env exists", async () => {
    const { getDeliveryStatus } = await loadDelivery({
      AUTH_OTP_PROVIDER: "resend_email",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: undefined,
    });

    expect(getDeliveryStatus()).toEqual(
      expect.objectContaining({
        email: expect.objectContaining({
          configured: false,
          missing: ["RESEND_API_KEY"],
          mode: "simulated",
          provider: "simulated",
        }),
        otp: expect.objectContaining({
          configured: false,
          provider: "resend_email",
        }),
      }),
    );
  });

  it("sends provider-backed email through Resend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ id: "email_123" }), ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await loadDelivery({
      AUTH_OTP_PROVIDER: "resend_email",
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: "Cargo Agent <ops@example.test>",
      RESEND_API_KEY: "re_test_key",
    });

    await expect(
      sendEmail({
        subject: "Invite",
        tags: { flow: "company-invite" },
        text: "Accept invite",
        to: "user@example.test",
      }),
    ).resolves.toEqual({
      dispatched: true,
      provider: "resend",
      providerMessageId: "email_123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
        method: "POST",
      }),
    );
  });

  it("returns traceable provider errors when Resend rejects delivery", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid key" }));
    const { sendEmail } = await loadDelivery({
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: "Cargo Agent <ops@example.test>",
      RESEND_API_KEY: "bad_key",
    });

    await expect(
      sendEmail({
        subject: "OTP",
        text: "123456",
        to: "user@example.test",
      }),
    ).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_ERROR",
      statusCode: 502,
    });
  });
});
