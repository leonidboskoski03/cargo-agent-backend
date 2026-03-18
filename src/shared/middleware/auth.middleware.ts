import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";
import { verifyAccessToken } from "../auth/jwt.js";
import type { Role } from "../auth/permissions.js";

function getToken(req: Request): string | null {
  const bearer = req.header("authorization")?.replace("Bearer ", "").trim();
  const cookie = req.cookies?.[env.JWT_COOKIE_NAME];
  return bearer || cookie || null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getToken(req);

  if (!token) {
    return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(new AppError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getToken(req);

  if (!token) {
    return next();
  }

  try {
    req.auth = verifyAccessToken(token);
  } catch {
    req.auth = undefined;
  }

  return next();
}

export function requireRole(roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.role || !roles.includes(req.auth.role as Role)) {
      return next(new AppError(403, "FORBIDDEN", "You do not have permission"));
    }

    return next();
  };
}

