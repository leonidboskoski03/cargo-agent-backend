import { Router } from "express";
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

contractsRouter.get("/", requireAuth, validate(listContractsSchema), listContracts);
contractsRouter.get("/:contractId", requireAuth, validate(getContractByIdSchema), getContractById);
contractsRouter.post("/", requireAuth, validate(createContractSchema), createContract);
contractsRouter.patch("/:contractId/status", requireAuth, validate(changeContractStatusSchema), changeContractStatus);
contractsRouter.delete("/:contractId", requireAuth, validate(deleteContractSchema), deleteContract);
contractsRouter.post("/:contractId/restore", requireAuth, validate(restoreContractSchema), restoreContract);

