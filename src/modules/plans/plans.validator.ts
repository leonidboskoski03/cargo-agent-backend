import { z } from "zod";
import { queryBoolean } from "../../shared/validation/queryBoolean.js";

export const listPlansSchema = z.object({
  query: z.object({
    activeOnly: queryBoolean().default(true),
  }),
  params: z.object({}),
  body: z.object({}),
});

