import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  changeContractStatus,
  createContract,
  deleteContract,
  getContractById,
  listContracts,
  restoreContract,
} from "./contracts.controller.js";
import {
  changeContractStatusSchema,
  createContractSchema,
  deleteContractSchema,
  getContractByIdSchema,
  listContractsSchema,
  restoreContractSchema,
} from "./contracts.validator.js";

export const contractsRouter = Router();

contractsRouter.get("/", requireAuth, validate(listContractsSchema), asyncRoute(listContracts));
contractsRouter.get("/:contractId", requireAuth, validate(getContractByIdSchema), asyncRoute(getContractById));
contractsRouter.post("/", requireAuth, validate(createContractSchema), asyncRoute(createContract));
contractsRouter.patch("/:contractId/status", requireAuth, validate(changeContractStatusSchema), asyncRoute(changeContractStatus));
contractsRouter.delete("/:contractId", requireAuth, validate(deleteContractSchema), asyncRoute(deleteContract));
contractsRouter.post("/:contractId/restore", requireAuth, validate(restoreContractSchema), asyncRoute(restoreContract));

