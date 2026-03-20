import { Router } from "express";
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

vehicleAssignmentsRouter.get("/", requireAuth, validate(listVehicleAssignmentsSchema), listVehicleAssignments);
vehicleAssignmentsRouter.get(
  "/:assignmentId",
  requireAuth,
  validate(getVehicleAssignmentByIdSchema),
  getVehicleAssignmentById,
);
vehicleAssignmentsRouter.post("/", requireAuth, validate(createVehicleAssignmentSchema), createVehicleAssignment);
vehicleAssignmentsRouter.patch(
  "/:assignmentId",
  requireAuth,
  validate(updateVehicleAssignmentSchema),
  updateVehicleAssignment,
);
vehicleAssignmentsRouter.delete(
  "/:assignmentId",
  requireAuth,
  validate(deleteVehicleAssignmentSchema),
  deleteVehicleAssignment,
);
vehicleAssignmentsRouter.post(
  "/:assignmentId/restore",
  requireAuth,
  validate(restoreVehicleAssignmentSchema),
  restoreVehicleAssignment,
);

