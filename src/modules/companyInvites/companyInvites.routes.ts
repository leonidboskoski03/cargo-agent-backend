import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { enforceUsageLimit } from "../../shared/middleware/enforceUsageLimit.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  acceptCompanyInvite,
  createCompanyInvite,
  listCompanyInvites,
  previewCompanyInvite,
  revokeCompanyInvite,
} from "./companyInvites.controller.js";
import {
  acceptCompanyInviteSchema,
  createCompanyInviteSchema,
  listCompanyInvitesSchema,
  previewCompanyInviteSchema,
  revokeCompanyInviteSchema,
} from "./companyInvites.validator.js";

export const companyInvitesRouter = Router();

companyInvitesRouter.get("/", requireAuth, validate(listCompanyInvitesSchema), asyncRoute(listCompanyInvites));
companyInvitesRouter.get("/preview", validate(previewCompanyInviteSchema), asyncRoute(previewCompanyInvite));
companyInvitesRouter.post("/", requireAuth, enforceUsageLimit("TEAM_MEMBERS"), validate(createCompanyInviteSchema), asyncRoute(createCompanyInvite));
companyInvitesRouter.post("/accept", requireAuth, validate(acceptCompanyInviteSchema), asyncRoute(acceptCompanyInvite));
companyInvitesRouter.post("/:inviteId/revoke", requireAuth, validate(revokeCompanyInviteSchema), asyncRoute(revokeCompanyInvite));
