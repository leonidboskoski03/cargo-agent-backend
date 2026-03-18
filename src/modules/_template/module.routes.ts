import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const moduleRouter = Router();

moduleRouter.get("/", (_req, res) => ok(res, { module: "replace-me", status: "ready" }));

