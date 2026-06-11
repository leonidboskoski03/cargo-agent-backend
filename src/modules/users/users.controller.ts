import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { UsersService } from "./users.service.js";

const service = new UsersService();


export async function getMyUser(req: Request, res: Response) {
  const data = await service.getMe(authFromRequest(req));
  return ok(res, data);
}

export async function getMyProfileCompletion(req: Request, res: Response) {
  const data = await service.getMyProfileCompletion(authFromRequest(req));
  return ok(res, data);
}

export async function listUsers(req: Request, res: Response) {
  const query = req.query as unknown as { includeInactive: boolean };
  const data = await service.list(authFromRequest(req), {
    includeInactive: query.includeInactive,
  });
  return ok(res, data);
}

export async function getUserById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.userId));
  return ok(res, data);
}

export async function updateMyUser(req: Request, res: Response) {
  const data = await service.updateMyProfile(authFromRequest(req), {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    isActive: req.body.isActive,
    role: req.body.role,
    companyId: req.body.companyId,
  });
  return ok(res, data);
}

export async function updateUserMembership(req: Request, res: Response) {
  const data = await service.updateMembership(authFromRequest(req), getStringParam(req.params.userId), {
    role: req.body.role,
    companyId: req.body.companyId,
  });
  return ok(res, data);
}

export async function deleteUser(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.userId));
  return ok(res, data);
}

export async function restoreUser(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.userId));
  return ok(res, data);
}

