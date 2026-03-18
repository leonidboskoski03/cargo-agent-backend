import { z } from "zod";

export const listAuditLogsSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    actorId: z.string().optional(),
    action: z.string().optional(),
  }),
});

