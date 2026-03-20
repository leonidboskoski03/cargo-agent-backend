import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listAuditLogs } from "./auditLogs.controller.js";
import { listAuditLogsSchema } from "./auditLogs.validator.js";

export const auditLogsRouter = Router();

auditLogsRouter.get("/", requireAuth, validate(listAuditLogsSchema), listAuditLogs);
