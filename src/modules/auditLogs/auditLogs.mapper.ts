import type { AuditLogListItemDto } from "./auditLogs.dto.js";

export function mapToAuditLogListItem(data: {
  id: string;
  actorId: string;
  action: string;
  createdAt: Date;
}): AuditLogListItemDto {
  return {
    id: data.id,
    actorId: data.actorId,
    action: data.action,
    createdAt: data.createdAt.toISOString(),
  };
}

