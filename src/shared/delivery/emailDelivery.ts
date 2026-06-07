import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../errors/AppError.js";

export type EmailDeliveryInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tags?: Record<string, string>;
};

export type EmailDeliveryResult = {
  provider: "resend" | "simulated";
  dispatched: boolean;
  providerMessageId?: string;
};

export type DeliveryStatus = {
  email: {
    configured: boolean;
    provider: "resend" | "simulated";
    mode: "provider" | "simulated";
    missing: string[];
  };
  otp: {
    configured: boolean;
    provider: string;
    previewEnabled: boolean;
  };
  invites: {
    configured: boolean;
    acceptUrlBase: string;
    provider: "resend" | "simulated";
  };
};

export function getDeliveryStatus(): DeliveryStatus {
  const missing: string[] = [];
  const wantsProvider = env.EMAIL_PROVIDER === "resend" || env.AUTH_OTP_PROVIDER === "resend_email";

  if (wantsProvider && !env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (wantsProvider && !env.EMAIL_FROM) missing.push("EMAIL_FROM");

  const provider = wantsProvider && missing.length === 0 ? "resend" : "simulated";

  return {
    email: {
      configured: provider === "resend",
      provider,
      mode: provider === "resend" ? "provider" : "simulated",
      missing,
    },
    otp: {
      configured: env.AUTH_OTP_PROVIDER === "resend_email" ? provider === "resend" : true,
      provider: env.AUTH_OTP_PROVIDER,
      previewEnabled: env.NODE_ENV !== "production" && env.AUTH_OTP_PREVIEW_IN_NON_PROD,
    },
    invites: {
      configured: provider === "resend",
      acceptUrlBase: env.INVITE_ACCEPT_URL_BASE,
      provider,
    },
  };
}

export async function sendEmail(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
  const status = getDeliveryStatus();

  if (status.email.provider !== "resend") {
    const providerMessageId = `simulated-email-${randomUUID()}`;
    logger.info(
      {
        to: input.to,
        subject: input.subject,
        tags: input.tags,
        providerMessageId,
      },
      "Simulated email delivery",
    );

    return {
      provider: "simulated",
      dispatched: env.NODE_ENV !== "production",
      providerMessageId,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      tags: input.tags
        ? Object.entries(input.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error({ status: response.status, body }, "Email provider rejected message");
    throw new AppError(502, "EMAIL_PROVIDER_ERROR", "Email provider rejected the delivery request");
  }

  const data = (await response.json().catch(() => ({}))) as { id?: string };
  return {
    provider: "resend",
    dispatched: true,
    providerMessageId: data.id ?? `resend-${randomUUID()}`,
  };
}
