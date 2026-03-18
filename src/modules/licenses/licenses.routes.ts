import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const licensesRouter = Router();

licensesRouter.get("/", (_req, res) => ok(res, { module: "licenses", status: "ready" }));

