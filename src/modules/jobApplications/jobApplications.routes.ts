import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  applyToJobApplication,
  createJobApplication,
  listJobApplicationFeed,
  listMyJobApplications,
  listSubmissionsForMyListing,
} from "./jobApplications.controller.js";
import {
  applyToJobApplicationSchema,
  createJobApplicationSchema,
  listJobApplicationsSchema,
  listMySubmissionsSchema,
} from "./jobApplications.validator.js";

export const jobApplicationsRouter = Router();

jobApplicationsRouter.get("/", requireAuth, validate(listJobApplicationsSchema), listJobApplicationFeed);
jobApplicationsRouter.get("/mine", requireAuth, validate(listJobApplicationsSchema), listMyJobApplications);
jobApplicationsRouter.post("/", requireAuth, validate(createJobApplicationSchema), createJobApplication);
jobApplicationsRouter.post(
  "/:jobApplicationId/apply",
  requireAuth,
  validate(applyToJobApplicationSchema),
  applyToJobApplication,
);
jobApplicationsRouter.get(
  "/:jobApplicationId/submissions",
  requireAuth,
  validate(listMySubmissionsSchema),
  listSubmissionsForMyListing,
);

