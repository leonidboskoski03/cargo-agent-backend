import { requireCompanyAdmin } from "./auditLogs.helpers.js";
import { AuditLogsRepository } from "./auditLogs.repository.js";
import type { AuthContext, ListQuery, WriteInput } from "./auditLogs.service.types.js";

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

