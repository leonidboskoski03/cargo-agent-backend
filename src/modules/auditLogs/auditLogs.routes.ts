import { Router } from "express";
 import { validate } from "../../shared/middleware/validate.middleware.js";
import { listAuditLogs } from "./auditLogs.controller.js";
import { listAuditLogsSchema } from "./auditLogs.validator.js";

export const auditLogsRouter = Router();

auditLogsRouter.get("/", validate(listAuditLogsSchema), listAuditLogs);
