import { Router } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export const usersRouter = Router();

usersRouter.get("/", (_req, res) => ok(res, { module: "users", status: "ready" }));

