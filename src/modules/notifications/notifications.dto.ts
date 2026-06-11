export type NotificationListItemDto = {
  body: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  payloadJson?: unknown;
  title: string;
  type: string;
};

