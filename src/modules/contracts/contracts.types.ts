import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  changeContractStatusSchema,
  createContractSchema,
  listContractsSchema,
  updateContractTimelineSchema,
} from "./contracts.validator.js";

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

export type ListContractsQuery = z.infer<typeof listContractsSchema>["query"];
export type CreateContractBody = z.infer<typeof createContractSchema>["body"];
export type ChangeContractStatusBody = z.infer<typeof changeContractStatusSchema>["body"];
export type UpdateContractTimelineBody = z.infer<typeof updateContractTimelineSchema>["body"];

