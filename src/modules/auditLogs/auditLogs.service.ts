import type { ParsedQs } from "qs";
import { AuditLogsRepository } from "./auditLogs.repository.js";

export class AuditLogsService {
  private readonly repository = new AuditLogsRepository();

  async list(_query: ParsedQs) {
    return this.repository.list();
  }
}

