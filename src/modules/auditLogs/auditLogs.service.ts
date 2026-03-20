import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import { listAuditLogsSchema } from "./auditLogs.validator.js";
import { AuditLogsRepository } from "./auditLogs.repository.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

type CompanyAdminAuth = {
  userId: string;
  role: UserRole;
  companyId: string;
};

type ListQuery = z.infer<typeof listAuditLogsSchema>["query"];

type WriteInput = {
  companyId: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payloadJson?: unknown;
};

function requireCompanyAdmin(auth: AuthContext): asserts auth is CompanyAdminAuth {
  if (!auth.userId || auth.role !== Roles.COMPANY_ADMIN || !auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can access audit logs");
  }
}

export class AuditLogsService {
  private readonly repository = new AuditLogsRepository();

  async list(auth: AuthContext, query: ListQuery) {
    requireCompanyAdmin(auth);

    return this.repository.list({
      companyId: auth.companyId,
      page: query.page,
      pageSize: query.pageSize,
      actorUserId: query.actorId,
      action: query.action,
    });
  }

  async write(input: WriteInput) {
    return this.repository.create(input);
  }
}

