import type { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  listUsersSchema,
  updateMyProfileSchema,
  updateUserMembershipSchema,
} from "./users.validator.js";

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

export type ListUsersQuery = z.infer<typeof listUsersSchema>["query"];
export type UpdateMyProfileBody = z.infer<typeof updateMyProfileSchema>["body"];
export type UpdateUserMembershipBody = z.infer<typeof updateUserMembershipSchema>["body"];

