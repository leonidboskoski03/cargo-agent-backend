import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listLanguages } from "./localization.controller.js";
import { listLanguagesSchema } from "./localization.validator.js";

export const localizationRouter = Router();

localizationRouter.get("/languages", validate(listLanguagesSchema), asyncRoute(listLanguages));
