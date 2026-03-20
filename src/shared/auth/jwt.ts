import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../../config/env.js";

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  role?: UserRole;
  companyId?: string;
  sid?: string;
  sv?: number;
  email?: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

