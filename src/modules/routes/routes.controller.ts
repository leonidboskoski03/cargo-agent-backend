import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { RoutesService } from "./routes.service.js";

const service = new RoutesService();

function authFromRequest(req: Request) {
  return req.auth ? { userId: req.auth.sub, role: req.auth.role, companyId: req.auth.companyId } : {};
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function listRoutes(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    originLocationId: typeof req.query.originLocationId === "string" ? req.query.originLocationId : undefined,
    destinationLocationId:
      typeof req.query.destinationLocationId === "string" ? req.query.destinationLocationId : undefined,
  });

  return ok(res, data);
}

export async function getRouteById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.routeId));
  return ok(res, data);
}

export async function createRoute(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    originLocationId: req.body.originLocationId,
    destinationLocationId: req.body.destinationLocationId,
    distanceKm: req.body.distanceKm,
    estimatedDurationMinutes: req.body.estimatedDurationMinutes,
    isActive: req.body.isActive,
  });

  return created(res, data);
}

export async function updateRoute(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.routeId), {
    originLocationId: req.body.originLocationId,
    destinationLocationId: req.body.destinationLocationId,
    distanceKm: req.body.distanceKm,
    estimatedDurationMinutes: req.body.estimatedDurationMinutes,
    isActive: req.body.isActive,
  });

  return ok(res, data);
}

export async function deleteRoute(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.routeId));
  return ok(res, data);
}

export async function restoreRoute(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.routeId));
  return ok(res, data);
}

