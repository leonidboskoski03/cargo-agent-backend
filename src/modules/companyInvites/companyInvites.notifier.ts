import type { UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

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

  // Dev fallback: no provider integration yet, return preview URL and log details.
  if (env.NODE_ENV !== "production") {
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
      dispatched: false,
      previewAcceptUrl: acceptUrl,
    };
  }

  // Production placeholder until a real email provider adapter is wired.
  logger.warn(
    {
      toEmail: input.toEmail,
      companyName: input.companyName,
      targetRole: input.targetRole,
    },
    "Company invite email provider is not configured; invite email was not sent",
  );

  return {
    dispatched: false,
    previewAcceptUrl: null,
  };
}

