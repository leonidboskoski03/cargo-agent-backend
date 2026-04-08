import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { LicensesService } from "./licenses.service.js";

const service = new LicensesService();


export async function listLicenses(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
  });

  return ok(res, data);
}

export async function getLicenseById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.licenseId));

  return ok(res, data);
}

export async function createLicense(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    userId: req.body.userId,
    licenseType: req.body.licenseType,
    issuedAt: req.body.issuedAt,
    expiresAt: req.body.expiresAt,
    isValid: req.body.isValid,
  });

  return created(res, data);
}

export async function updateLicense(req: Request, res: Response) {
  const data = await service.update(
    authFromRequest(req),
    getStringParam(req.params.licenseId),
    {
      licenseType: req.body.licenseType,
      issuedAt: req.body.issuedAt,
      expiresAt: req.body.expiresAt,
      isValid: req.body.isValid,
    },
  );

  return ok(res, data);
}

export async function deleteLicense(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.licenseId));

  return ok(res, data);
}

export async function restoreLicense(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.licenseId));

  return ok(res, data);
}


