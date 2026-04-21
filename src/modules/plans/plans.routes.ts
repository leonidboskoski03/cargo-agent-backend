import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listPlans } from "./plans.controller.js";
import { listPlansSchema } from "./plans.validator.js";

export const plansRouter = Router();

plansRouter.get("/", validate(listPlansSchema), asyncRoute(listPlans));

