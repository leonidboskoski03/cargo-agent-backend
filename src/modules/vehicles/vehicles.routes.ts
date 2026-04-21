import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
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

vehiclesRouter.get("/", requireAuth, validate(listVehiclesSchema), asyncRoute(listVehicles));
vehiclesRouter.get("/:vehicleId", requireAuth, validate(getVehicleByIdSchema), asyncRoute(getVehicleById));
vehiclesRouter.post("/", requireAuth, validate(createVehicleSchema), asyncRoute(createVehicle));
vehiclesRouter.patch("/:vehicleId", requireAuth, validate(updateVehicleSchema), asyncRoute(updateVehicle));
vehiclesRouter.delete("/:vehicleId", requireAuth, validate(deleteVehicleSchema), asyncRoute(deleteVehicle));
vehiclesRouter.post("/:vehicleId/restore", requireAuth, validate(restoreVehicleSchema), asyncRoute(restoreVehicle));

