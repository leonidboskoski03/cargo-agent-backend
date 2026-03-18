import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const routesRouter = Router();

routesRouter.get("/", (_req, res) => ok(res, { module: "routes", status: "ready" }));

