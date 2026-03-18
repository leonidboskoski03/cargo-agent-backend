import { Router } from "express";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listPlans } from "./plans.controller.js";
import { listPlansSchema } from "./plans.validator.js";

export const plansRouter = Router();

plansRouter.get("/", validate(listPlansSchema), listPlans);

