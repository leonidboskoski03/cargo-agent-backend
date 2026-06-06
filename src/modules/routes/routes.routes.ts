import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createRoute,
  deleteRoute,
  estimateRoute,
  getRouteById,
  listRoutes,
  restoreRoute,
  updateRoute,
} from "./routes.controller.js";
import {
  createRouteEstimateSchema,
  createRouteSchema,
  deleteRouteSchema,
  getRouteByIdSchema,
  listRoutesSchema,
  restoreRouteSchema,
  updateRouteSchema,
} from "./routes.validator.js";

export const routesRouter = Router();

routesRouter.get("/", requireAuth, validate(listRoutesSchema), asyncRoute(listRoutes));
routesRouter.post("/estimate", requireAuth, validate(createRouteEstimateSchema), asyncRoute(estimateRoute));
routesRouter.post("/", requireAuth, validate(createRouteSchema), asyncRoute(createRoute));
routesRouter.get("/:routeId", requireAuth, validate(getRouteByIdSchema), asyncRoute(getRouteById));
routesRouter.patch("/:routeId", requireAuth, validate(updateRouteSchema), asyncRoute(updateRoute));
routesRouter.delete("/:routeId", requireAuth, validate(deleteRouteSchema), asyncRoute(deleteRoute));
routesRouter.post("/:routeId/restore", requireAuth, validate(restoreRouteSchema), asyncRoute(restoreRoute));

