import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  acceptCompanyInvite,
  createCompanyInvite,
  listCompanyInvites,
  revokeCompanyInvite,
} from "./companyInvites.controller.js";
import {
  acceptCompanyInviteSchema,
  createCompanyInviteSchema,
  listCompanyInvitesSchema,
  revokeCompanyInviteSchema,
} from "./companyInvites.validator.js";

export const companyInvitesRouter = Router();

companyInvitesRouter.get("/", requireAuth, validate(listCompanyInvitesSchema), listCompanyInvites);
companyInvitesRouter.post("/", requireAuth, validate(createCompanyInviteSchema), createCompanyInvite);
companyInvitesRouter.post("/accept", requireAuth, validate(acceptCompanyInviteSchema), acceptCompanyInvite);
companyInvitesRouter.post("/:inviteId/revoke", requireAuth, validate(revokeCompanyInviteSchema), revokeCompanyInvite);

