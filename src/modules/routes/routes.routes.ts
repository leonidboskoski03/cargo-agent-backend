import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createRoute,
  deleteRoute,
  getRouteById,
  listRoutes,
  restoreRoute,
  updateRoute,
} from "./routes.controller.js";
import {
  createRouteSchema,
  deleteRouteSchema,
  getRouteByIdSchema,
  listRoutesSchema,
  restoreRouteSchema,
  updateRouteSchema,
} from "./routes.validator.js";

export const routesRouter = Router();

routesRouter.get("/", requireAuth, validate(listRoutesSchema), listRoutes);
routesRouter.get("/:routeId", requireAuth, validate(getRouteByIdSchema), getRouteById);
routesRouter.post("/", requireAuth, validate(createRouteSchema), createRoute);
routesRouter.patch("/:routeId", requireAuth, validate(updateRouteSchema), updateRoute);
routesRouter.delete("/:routeId", requireAuth, validate(deleteRouteSchema), deleteRoute);
routesRouter.post("/:routeId/restore", requireAuth, validate(restoreRouteSchema), restoreRoute);

