import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const reviewsRouter = Router();

reviewsRouter.get("/", (_req, res) => ok(res, { module: "reviews", status: "ready" }));

