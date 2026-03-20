import { AuditLogsService } from "../../modules/auditLogs/auditLogs.service.js";

type AuditEventInput = {
  companyId: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payloadJson?: unknown;
};

const auditService = new AuditLogsService();

export async function writeAuditEvent(input: AuditEventInput) {
  try {
    await auditService.write(input);
  } catch {
    // Best-effort logging: domain actions should not fail if audit insert fails.
  }
}

