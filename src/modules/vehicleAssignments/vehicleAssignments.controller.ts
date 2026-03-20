import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { VehicleAssignmentsService } from "./vehicleAssignments.service.js";

const service = new VehicleAssignmentsService();

function authFromRequest(req: Request) {
  return req.auth ? { userId: req.auth.sub, role: req.auth.role, companyId: req.auth.companyId } : {};
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function listVehicleAssignments(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req));
  return ok(res, data);
}

export async function getVehicleAssignmentById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.assignmentId));
  return ok(res, data);
}

export async function createVehicleAssignment(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    vehicleId: req.body.vehicleId,
    driverUserId: req.body.driverUserId,
    startsAt: req.body.startsAt,
    endsAt: req.body.endsAt,
  });

  return created(res, data);
}

export async function updateVehicleAssignment(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.assignmentId), {
    vehicleId: req.body.vehicleId,
    driverUserId: req.body.driverUserId,
    startsAt: req.body.startsAt,
    endsAt: req.body.endsAt,
  });

  return ok(res, data);
}

export async function deleteVehicleAssignment(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.assignmentId));
  return ok(res, data);
}

export async function restoreVehicleAssignment(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.assignmentId));
  return ok(res, data);
}

