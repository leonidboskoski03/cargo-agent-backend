import type { Request } from "express";

export function authFromRequest(req: Request) {
  return req.auth ? { userId: req.auth.sub, role: req.auth.role, companyId: req.auth.companyId } : {};
}

export function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

