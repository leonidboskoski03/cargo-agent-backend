import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  listVehicles,
  restoreVehicle,
  updateVehicle,
} from "./vehicles.controller.js";
import {
  createVehicleSchema,
  deleteVehicleSchema,
  getVehicleByIdSchema,
  listVehiclesSchema,
  restoreVehicleSchema,
  updateVehicleSchema,
} from "./vehicles.validator.js";

export const vehiclesRouter = Router();

vehiclesRouter.get("/", requireAuth, validate(listVehiclesSchema), listVehicles);
vehiclesRouter.get("/:vehicleId", requireAuth, validate(getVehicleByIdSchema), getVehicleById);
vehiclesRouter.post("/", requireAuth, validate(createVehicleSchema), createVehicle);
vehiclesRouter.patch("/:vehicleId", requireAuth, validate(updateVehicleSchema), updateVehicle);
vehiclesRouter.delete("/:vehicleId", requireAuth, validate(deleteVehicleSchema), deleteVehicle);
vehiclesRouter.post("/:vehicleId/restore", requireAuth, validate(restoreVehicleSchema), restoreVehicle);

