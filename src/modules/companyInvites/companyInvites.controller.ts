import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { CompanyInvitesService } from "./companyInvites.service.js";

const service = new CompanyInvitesService();


export async function listCompanyInvites(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    status: typeof req.query.status === "string" ? req.query.status : undefined,
  });

  return ok(res, data);
}

export async function createCompanyInvite(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    invitedEmail: req.body.invitedEmail,
    targetRole: req.body.targetRole,
  });

  return created(res, data);
}

export async function acceptCompanyInvite(req: Request, res: Response) {
  const data = await service.accept(authFromRequest(req), {
    token: req.body.token,
    otpChallengeId: req.body.otpChallengeId,
  });
  return ok(res, {
    ...data,
    nextAction: {
      type: "REFRESH_AUTH_SESSION",
      message: "Membership changed. Refresh session to receive new role/company claims.",
    },
  });
}

export async function revokeCompanyInvite(req: Request, res: Response) {
  const data = await service.revoke(authFromRequest(req), getStringParam(req.params.inviteId));
  return ok(res, data);
}

