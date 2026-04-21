import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createLocation,
  deleteLocation,
  getLocationById,
  listLocations,
  restoreLocation,
  updateLocation,
} from "./locations.controller.js";
import {
  createLocationSchema,
  deleteLocationSchema,
  getLocationByIdSchema,
  listLocationsSchema,
  restoreLocationSchema,
  updateLocationSchema,
} from "./locations.validator.js";

export const locationsRouter = Router();

locationsRouter.get("/", requireAuth, validate(listLocationsSchema), asyncRoute(listLocations));
locationsRouter.get("/:locationId", requireAuth, validate(getLocationByIdSchema), asyncRoute(getLocationById));
locationsRouter.post("/", requireAuth, validate(createLocationSchema), asyncRoute(createLocation));
locationsRouter.patch("/:locationId", requireAuth, validate(updateLocationSchema), asyncRoute(updateLocation));
locationsRouter.delete("/:locationId", requireAuth, validate(deleteLocationSchema), asyncRoute(deleteLocation));
locationsRouter.post("/:locationId/restore", requireAuth, validate(restoreLocationSchema), asyncRoute(restoreLocation));

