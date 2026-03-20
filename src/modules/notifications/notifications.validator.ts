import { z } from "zod";

const cuidParam = z.string().cuid();

export const listNotificationsSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: z.coerce.boolean().optional(),
  }),
});

export const markNotificationReadSchema = z.object({
  params: z.object({
    notificationId: cuidParam,
  }),
  body: z.object({}),
  query: z.object({}),
});

export const markAllNotificationsReadSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({}),
});

