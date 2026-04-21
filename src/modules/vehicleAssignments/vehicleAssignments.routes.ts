import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createVehicleAssignment,
  deleteVehicleAssignment,
  getVehicleAssignmentById,
  listVehicleAssignments,
  restoreVehicleAssignment,
  updateVehicleAssignment,
} from "./vehicleAssignments.controller.js";
import {
  createVehicleAssignmentSchema,
  deleteVehicleAssignmentSchema,
  getVehicleAssignmentByIdSchema,
  listVehicleAssignmentsSchema,
  restoreVehicleAssignmentSchema,
  updateVehicleAssignmentSchema,
} from "./vehicleAssignments.validator.js";

export const vehicleAssignmentsRouter = Router();

vehicleAssignmentsRouter.get("/", requireAuth, validate(listVehicleAssignmentsSchema), asyncRoute(listVehicleAssignments));
vehicleAssignmentsRouter.get(
  "/:assignmentId",
  requireAuth,
  validate(getVehicleAssignmentByIdSchema),
  asyncRoute(getVehicleAssignmentById),
);
vehicleAssignmentsRouter.post("/", requireAuth, validate(createVehicleAssignmentSchema), asyncRoute(createVehicleAssignment));
vehicleAssignmentsRouter.patch(
  "/:assignmentId",
  requireAuth,
  validate(updateVehicleAssignmentSchema),
  asyncRoute(updateVehicleAssignment),
);
vehicleAssignmentsRouter.delete(
  "/:assignmentId",
  requireAuth,
  validate(deleteVehicleAssignmentSchema),
  asyncRoute(deleteVehicleAssignment),
);
vehicleAssignmentsRouter.post(
  "/:assignmentId/restore",
  requireAuth,
  validate(restoreVehicleAssignmentSchema),
  asyncRoute(restoreVehicleAssignment),
);

