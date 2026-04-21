import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createLicense,
  deleteLicense,
  getLicenseById,
  listLicenses,
  restoreLicense,
  updateLicense,
} from "./licenses.controller.js";
import {
  createLicenseSchema,
  deleteLicenseSchema,
  getLicenseByIdSchema,
  listLicensesSchema,
  restoreLicenseSchema,
  updateLicenseSchema,
} from "./licenses.validator.js";

export const licensesRouter = Router();

licensesRouter.get("/", requireAuth, validate(listLicensesSchema), asyncRoute(listLicenses));
licensesRouter.get("/:licenseId", requireAuth, validate(getLicenseByIdSchema), asyncRoute(getLicenseById));
licensesRouter.post("/", requireAuth, validate(createLicenseSchema), asyncRoute(createLicense));
licensesRouter.patch("/:licenseId", requireAuth, validate(updateLicenseSchema), asyncRoute(updateLicense));
licensesRouter.delete("/:licenseId", requireAuth, validate(deleteLicenseSchema), asyncRoute(deleteLicense));
licensesRouter.post("/:licenseId/restore", requireAuth, validate(restoreLicenseSchema), asyncRoute(restoreLicense));

