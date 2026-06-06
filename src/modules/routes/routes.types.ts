import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { createRouteEstimateSchema, createRouteSchema, listRoutesSchema, updateRouteSchema } from "./routes.validator.js";

export type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

export type RequiredAuthContext = {
  userId: string;
  role: UserRole;
  companyId?: string;
};

export type ListRoutesQuery = z.infer<typeof listRoutesSchema>["query"];
export type CreateRouteBody = z.infer<typeof createRouteSchema>["body"];
export type UpdateRouteBody = z.infer<typeof updateRouteSchema>["body"];
export type CreateRouteEstimateBody = z.infer<typeof createRouteEstimateSchema>["body"];

