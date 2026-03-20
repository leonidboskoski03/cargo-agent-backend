import { Router } from "express";
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

licensesRouter.get("/", requireAuth, validate(listLicensesSchema), listLicenses);
licensesRouter.get("/:licenseId", requireAuth, validate(getLicenseByIdSchema), getLicenseById);
licensesRouter.post("/", requireAuth, validate(createLicenseSchema), createLicense);
licensesRouter.patch("/:licenseId", requireAuth, validate(updateLicenseSchema), updateLicense);
licensesRouter.delete("/:licenseId", requireAuth, validate(deleteLicenseSchema), deleteLicense);
licensesRouter.post("/:licenseId/restore", requireAuth, validate(restoreLicenseSchema), restoreLicense);

