import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const vehiclesRouter = Router();

vehiclesRouter.get("/", (_req, res) => ok(res, { module: "vehicles", status: "ready" }));

