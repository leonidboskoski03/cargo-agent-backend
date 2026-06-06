import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listCities, listCountries } from "./geo.controller.js";
import { listCitiesSchema, listCountriesSchema } from "./geo.validator.js";

export const geoRouter = Router();

geoRouter.get("/countries", validate(listCountriesSchema), asyncRoute(listCountries));
geoRouter.get("/cities", validate(listCitiesSchema), asyncRoute(listCities));
