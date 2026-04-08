import { UserRole } from "@prisma/client";

export type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

