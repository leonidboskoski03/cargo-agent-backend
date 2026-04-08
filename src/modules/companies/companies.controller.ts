import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { CompaniesService } from "./companies.service.js";

const service = new CompaniesService();


export async function listCompanies(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req));
  return ok(res, data);
}

export async function getMyCompany(req: Request, res: Response) {
  const data = await service.getMine(authFromRequest(req));
  return ok(res, data);
}

export async function getCompanyById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.companyId));
  return ok(res, data);
}

export async function updateMyCompany(req: Request, res: Response) {
  const data = await service.updateMine(authFromRequest(req), {
    companyType: req.body.companyType,
    name: req.body.name,
    countryCode: req.body.countryCode,
    city: req.body.city,
    address: req.body.address,
    phone: req.body.phone,
    email: req.body.email,
    website: req.body.website,
    logoUrl: req.body.logoUrl,
    bannerUrl: req.body.bannerUrl,
    bio: req.body.bio,
    foundedAt: req.body.foundedAt,
    employeeCount: req.body.employeeCount,
    isVerified: req.body.isVerified,
    registrationNumber: req.body.registrationNumber,
    vatNumber: req.body.vatNumber,
    stripeCustomerId: req.body.stripeCustomerId,
  });

  return ok(res, data);
}

export async function deleteMyCompany(req: Request, res: Response) {
  const data = await service.removeMine(authFromRequest(req));
  return ok(res, data);
}

export async function restoreCompany(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.companyId));
  return ok(res, data);
}

