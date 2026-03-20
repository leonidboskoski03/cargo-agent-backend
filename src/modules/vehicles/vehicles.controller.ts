import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { VehiclesService } from "./vehicles.service.js";

const service = new VehiclesService();

function authFromRequest(req: Request) {
  return req.auth ? { userId: req.auth.sub, role: req.auth.role, companyId: req.auth.companyId } : {};
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function listVehicles(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req));
  return ok(res, data);
}

export async function getVehicleById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.vehicleId));
  return ok(res, data);
}

export async function createVehicle(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    vehicleType: req.body.vehicleType,
    plateNumber: req.body.plateNumber,
    countryOfRegistration: req.body.countryOfRegistration,
    brand: req.body.brand,
    model: req.body.model,
    year: req.body.year,
    capacityKg: req.body.capacityKg,
    volumeM3: req.body.volumeM3,
    bodyType: req.body.bodyType,
    refrigerated: req.body.refrigerated,
    hazmatCertified: req.body.hazmatCertified,
    isActive: req.body.isActive,
  });

  return created(res, data);
}

export async function updateVehicle(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.vehicleId), {
    vehicleType: req.body.vehicleType,
    plateNumber: req.body.plateNumber,
    countryOfRegistration: req.body.countryOfRegistration,
    brand: req.body.brand,
    model: req.body.model,
    year: req.body.year,
    capacityKg: req.body.capacityKg,
    volumeM3: req.body.volumeM3,
    bodyType: req.body.bodyType,
    refrigerated: req.body.refrigerated,
    hazmatCertified: req.body.hazmatCertified,
    isActive: req.body.isActive,
  });

  return ok(res, data);
}

export async function deleteVehicle(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.vehicleId));
  return ok(res, data);
}

export async function restoreVehicle(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.vehicleId));
  return ok(res, data);
}

