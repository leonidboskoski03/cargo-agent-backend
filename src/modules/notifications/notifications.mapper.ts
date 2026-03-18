import type { NotificationListItemDto } from "./notifications.dto.js";

export function mapToNotificationListItem(data: {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
}): NotificationListItemDto {
  return {
    id: data.id,
    title: data.title,
    body: data.body,
    isRead: data.isRead,
    createdAt: data.createdAt.toISOString(),
  };
}

