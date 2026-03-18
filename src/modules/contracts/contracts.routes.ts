import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const contractsRouter = Router();

contractsRouter.get("/", (_req, res) => ok(res, { module: "contracts", status: "ready" }));

