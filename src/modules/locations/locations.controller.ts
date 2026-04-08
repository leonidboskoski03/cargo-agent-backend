import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { LocationsService } from "./locations.service.js";

const service = new LocationsService();


export async function listLocations(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    countryCode: typeof req.query.countryCode === "string" ? req.query.countryCode : undefined,
    city: typeof req.query.city === "string" ? req.query.city : undefined,
  });

  return ok(res, data);
}

export async function getLocationById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.locationId));
  return ok(res, data);
}

export async function createLocation(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    countryCode: req.body.countryCode,
    city: req.body.city,
    region: req.body.region,
    postalCode: req.body.postalCode,
    lat: req.body.lat,
    lng: req.body.lng,
  });

  return created(res, data);
}

export async function updateLocation(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.locationId), {
    countryCode: req.body.countryCode,
    city: req.body.city,
    region: req.body.region,
    postalCode: req.body.postalCode,
    lat: req.body.lat,
    lng: req.body.lng,
  });

  return ok(res, data);
}

export async function deleteLocation(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.locationId));
  return ok(res, data);
}

export async function restoreLocation(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.locationId));
  return ok(res, data);
}

