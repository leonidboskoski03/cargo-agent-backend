import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { createVehicleSchema, updateVehicleSchema } from "./vehicles.validator.js";

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

export type CreateVehicleBody = z.infer<typeof createVehicleSchema>["body"];
export type UpdateVehicleBody = z.infer<typeof updateVehicleSchema>["body"];

