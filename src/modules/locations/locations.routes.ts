import { Router } from "express";
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

locationsRouter.get("/", requireAuth, validate(listLocationsSchema), listLocations);
locationsRouter.get("/:locationId", requireAuth, validate(getLocationByIdSchema), getLocationById);
locationsRouter.post("/", requireAuth, validate(createLocationSchema), createLocation);
locationsRouter.patch("/:locationId", requireAuth, validate(updateLocationSchema), updateLocation);
locationsRouter.delete("/:locationId", requireAuth, validate(deleteLocationSchema), deleteLocation);
locationsRouter.post("/:locationId/restore", requireAuth, validate(restoreLocationSchema), restoreLocation);

