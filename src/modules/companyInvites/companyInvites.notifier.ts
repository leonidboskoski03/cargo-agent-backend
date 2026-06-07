import type { UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sendEmail } from "../../shared/delivery/emailDelivery.js";

type CompanyInviteEmailInput = {
  toEmail: string;
  companyName: string;
  targetRole: UserRole;
  token: string;
};

function buildAcceptUrl(token: string) {
  const acceptUrl = new URL(env.INVITE_ACCEPT_URL_BASE);
  acceptUrl.searchParams.set("token", token);
  return acceptUrl.toString();
}

export async function sendCompanyInviteEmail(input: CompanyInviteEmailInput) {
  const acceptUrl = buildAcceptUrl(input.token);

  const result = await sendEmail({
    to: input.toEmail,
    subject: `${input.companyName} invited you to Cargo Agent`,
    text: `${input.companyName} invited you as ${input.targetRole}. Accept the invite: ${acceptUrl}`,
    html: `<p>${input.companyName} invited you as <strong>${input.targetRole}</strong>.</p><p><a href="${acceptUrl}">Accept invite</a></p>`,
    tags: {
      domain: "company-invites",
      targetRole: input.targetRole,
    },
  });

  if (result.provider === "simulated") {
    logger.info(
      {
        toEmail: input.toEmail,
        companyName: input.companyName,
        targetRole: input.targetRole,
        acceptUrl,
      },
      "Company invite email preview",
    );

    return {
      dispatched: result.dispatched,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      previewAcceptUrl: acceptUrl,
    };
  }

  return {
    dispatched: result.dispatched,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    previewAcceptUrl: env.NODE_ENV === "production" ? null : acceptUrl,
  };
}

