import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { VehicleMarketplaceService } from "./vehicleMarketplace.service.js";

const service = new VehicleMarketplaceService();

export async function listVehicleMarketplaceListings(req: Request, res: Response) {
  const result = await service.list(authFromRequest(req), req.query as never);
  return ok(res, result.items, { pagination: result.meta });
}

export async function listMyVehicleMarketplaceListings(req: Request, res: Response) {
  const result = await service.listMine(authFromRequest(req), req.query as never);
  return ok(res, result.items, { pagination: result.meta });
}

export async function getVehicleMarketplaceListing(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.listingId));
  return ok(res, data);
}

export async function createVehicleMarketplaceListing(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), req.body);
  return created(res, data);
}

export async function updateVehicleMarketplaceListing(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.listingId), req.body);
  return ok(res, data);
}

export async function deleteVehicleMarketplaceListing(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.listingId));
  return ok(res, data);
}

export async function restoreVehicleMarketplaceListing(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.listingId));
  return ok(res, data);
}

export async function createVehicleMarketplaceInquiry(req: Request, res: Response) {
  const data = await service.createInquiry(authFromRequest(req), getStringParam(req.params.listingId), req.body);
  return created(res, data);
}

export async function listVehicleMarketplaceInquiries(req: Request, res: Response) {
  const result = await service.listInquiries(authFromRequest(req), req.query as never);
  return ok(res, result.items, { pagination: result.meta });
}

export async function updateVehicleMarketplaceInquiry(req: Request, res: Response) {
  const data = await service.updateInquiry(authFromRequest(req), getStringParam(req.params.inquiryId), req.body);
  return ok(res, data);
}
