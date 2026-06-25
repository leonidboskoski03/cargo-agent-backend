import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  createVehicleAssignmentSchema,
  listVehicleAssignmentsSchema,
  updateVehicleAssignmentSchema,
} from "./vehicleAssignments.validator.js";

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

export type CreateAssignmentBody = z.infer<typeof createVehicleAssignmentSchema>["body"];
export type ListVehicleAssignmentsQuery = z.infer<typeof listVehicleAssignmentsSchema>["query"];
export type UpdateAssignmentBody = z.infer<typeof updateVehicleAssignmentSchema>["body"];

