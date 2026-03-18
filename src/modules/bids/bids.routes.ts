import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const bidsRouter = Router();

bidsRouter.get("/", (_req, res) => ok(res, { module: "bids", status: "ready" }));

