import type { JwtPayload } from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: JwtPayload & { sub: string; role?: UserRole; companyId?: string; sid?: string; sv?: number; email?: string };
    }
  }
}

export {};

