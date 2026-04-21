import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  deleteMyCompany,
  getCompanyById,
  getMyCompany,
  listCompanies,
  restoreCompany,
  updateMyCompany,
} from "./companies.controller.js";
import {
  deleteMyCompanySchema,
  getCompanyByIdSchema,
  getMyCompanySchema,
  listCompaniesSchema,
  restoreCompanySchema,
  updateMyCompanySchema,
} from "./companies.validator.js";

export const companiesRouter = Router();

companiesRouter.get("/", requireAuth, validate(listCompaniesSchema), asyncRoute(listCompanies));
companiesRouter.get("/me", requireAuth, validate(getMyCompanySchema), asyncRoute(getMyCompany));
companiesRouter.get("/:companyId", requireAuth, validate(getCompanyByIdSchema), asyncRoute(getCompanyById));
companiesRouter.patch("/me", requireAuth, validate(updateMyCompanySchema), asyncRoute(updateMyCompany));
companiesRouter.delete("/me", requireAuth, validate(deleteMyCompanySchema), asyncRoute(deleteMyCompany));
companiesRouter.post("/:companyId/restore", requireAuth, validate(restoreCompanySchema), asyncRoute(restoreCompany));

