import { OtpChannel } from "@prisma/client";
import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

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

export function createOtpDeliveryProvider(): OtpDeliveryProvider {
  if (env.AUTH_OTP_PROVIDER === "twilio_simulated") {
    return new SimulatedOtpDeliveryProvider("twilio_simulated");
  }

  return new SimulatedOtpDeliveryProvider("simulated");
}

