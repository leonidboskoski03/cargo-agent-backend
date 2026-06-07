import { OtpChannel } from "@prisma/client";
import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sendEmail } from "../../shared/delivery/emailDelivery.js";

export type SendOtpDeliveryInput = {
  channel: OtpChannel;
  destination: string;
  code: string;
  purpose: string;
};

export type OtpDeliveryResult = {
  provider: string;
  dispatched: boolean;
  providerMessageId?: string;
  previewCode?: string;
};

export interface OtpDeliveryProvider {
  sendOtp(input: SendOtpDeliveryInput): Promise<OtpDeliveryResult>;
}

class SimulatedOtpDeliveryProvider implements OtpDeliveryProvider {
  constructor(private readonly providerName: string) {}

  async sendOtp(input: SendOtpDeliveryInput): Promise<OtpDeliveryResult> {
    const providerMessageId = `${this.providerName}-${randomUUID()}`;

    logger.info(
      {
        provider: this.providerName,
        channel: input.channel,
        destination: input.destination,
        purpose: input.purpose,
        otpCode: input.code,
        providerMessageId,
      },
      "Simulated OTP delivery",
    );

    return {
      provider: this.providerName,
      dispatched: true,
      providerMessageId,
      previewCode: env.NODE_ENV === "production" || !env.AUTH_OTP_PREVIEW_IN_NON_PROD ? undefined : input.code,
    };
  }
}

class ResendEmailOtpDeliveryProvider implements OtpDeliveryProvider {
  async sendOtp(input: SendOtpDeliveryInput): Promise<OtpDeliveryResult> {
    if (input.channel !== OtpChannel.EMAIL) {
      return new SimulatedOtpDeliveryProvider("simulated").sendOtp(input);
    }

    const subject = "Your Cargo Agent verification code";
    const result = await sendEmail({
      to: input.destination,
      subject,
      text: `Your Cargo Agent code is ${input.code}. It is valid for ${env.AUTH_OTP_TTL_MINUTES} minutes.`,
      html: `<p>Your Cargo Agent code is <strong>${input.code}</strong>.</p><p>It is valid for ${env.AUTH_OTP_TTL_MINUTES} minutes.</p>`,
      tags: {
        domain: "auth",
        purpose: input.purpose,
      },
    });

    return {
      provider: result.provider === "resend" ? "resend_email" : "simulated",
      dispatched: result.dispatched,
      providerMessageId: result.providerMessageId,
      previewCode: env.NODE_ENV === "production" || !env.AUTH_OTP_PREVIEW_IN_NON_PROD ? undefined : input.code,
    };
  }
}

export function createOtpDeliveryProvider(): OtpDeliveryProvider {
  if (env.AUTH_OTP_PROVIDER === "twilio_simulated") {
    return new SimulatedOtpDeliveryProvider("twilio_simulated");
  }
  if (env.AUTH_OTP_PROVIDER === "resend_email") {
    return new ResendEmailOtpDeliveryProvider();
  }

  return new SimulatedOtpDeliveryProvider("simulated");
}

