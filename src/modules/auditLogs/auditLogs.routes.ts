import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listAuditLogs } from "./auditLogs.controller.js";
import { listAuditLogsSchema } from "./auditLogs.validator.js";

export const auditLogsRouter = Router();

auditLogsRouter.get("/", requireAuth, validate(listAuditLogsSchema), asyncRoute(listAuditLogs));
