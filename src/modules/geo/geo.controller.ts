import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { GeoService } from "./geo.service.js";

const service = new GeoService();

export async function listCountries(_req: Request, res: Response) {
  const data = await service.listCountries();
  return ok(res, data);
}

export async function listCities(req: Request, res: Response) {
  const data = await service.listCities({
    countryCode: typeof req.query.countryCode === "string" ? req.query.countryCode : undefined,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    pageSize: typeof req.query.pageSize === "string" ? Number(req.query.pageSize) : undefined,
  });
  return ok(res, data);
}
