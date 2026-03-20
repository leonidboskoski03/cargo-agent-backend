import { Router } from "express";
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

companiesRouter.get("/", requireAuth, validate(listCompaniesSchema), listCompanies);
companiesRouter.get("/me", requireAuth, validate(getMyCompanySchema), getMyCompany);
companiesRouter.get("/:companyId", requireAuth, validate(getCompanyByIdSchema), getCompanyById);
companiesRouter.patch("/me", requireAuth, validate(updateMyCompanySchema), updateMyCompany);
companiesRouter.delete("/me", requireAuth, validate(deleteMyCompanySchema), deleteMyCompany);
companiesRouter.post("/:companyId/restore", requireAuth, validate(restoreCompanySchema), restoreCompany);

