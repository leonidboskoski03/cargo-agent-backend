import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const companiesRouter = Router();

companiesRouter.get("/", (_req, res) => ok(res, { module: "companies", status: "ready" }));

