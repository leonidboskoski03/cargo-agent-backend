import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const vehicleAssignmentsRouter = Router();

vehicleAssignmentsRouter.get("/", (_req, res) => ok(res, { module: "vehicleAssignments", status: "ready" }));

