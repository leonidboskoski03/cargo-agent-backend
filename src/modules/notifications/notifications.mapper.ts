import type { NotificationListItemDto } from "./notifications.dto.js";

export function mapToNotificationListItem(data: {
  body: string;
  createdAt: Date;
  id: string;
  payloadJson?: unknown;
  readAt?: Date | null;
  title: string;
  type: string;
}): NotificationListItemDto {
  return {
    body: data.body,
    createdAt: data.createdAt.toISOString(),
    id: data.id,
    isRead: Boolean(data.readAt),
    payloadJson: data.payloadJson,
    title: data.title,
    type: data.type,
  };
}

