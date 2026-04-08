import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { listAuditLogsSchema } from "./auditLogs.validator.js";

export type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

export type CompanyAdminAuth = {
  userId: string;
  role: UserRole;
  companyId: string;
};

export type ListQuery = z.infer<typeof listAuditLogsSchema>["query"];

export type WriteInput = {
  companyId: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payloadJson?: unknown;
};

