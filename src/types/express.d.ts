import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: JwtPayload & { sub: string; role?: string; companyId?: string };
    }
  }
}

export {};

