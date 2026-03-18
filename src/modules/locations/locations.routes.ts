import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const locationsRouter = Router();

locationsRouter.get("/", (_req, res) => ok(res, { module: "locations", status: "ready" }));

