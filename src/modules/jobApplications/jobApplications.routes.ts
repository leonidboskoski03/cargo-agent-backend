import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  applyToJobApplication,
  createJobApplication,
  listJobApplicationFeed,
  listMyJobApplications,
  listSubmissionsForMyListing,
  promoteJobApplication,
  promoteJobApplicationSubmission,
} from "./jobApplications.controller.js";
import {
  applyToJobApplicationSchema,
  createJobApplicationSchema,
  listJobApplicationsSchema,
  listMySubmissionsSchema,
  promoteJobApplicationSchema,
  promoteSubmissionSchema,
} from "./jobApplications.validator.js";

export const jobApplicationsRouter = Router();

jobApplicationsRouter.get("/", requireAuth, validate(listJobApplicationsSchema), listJobApplicationFeed);
jobApplicationsRouter.get("/mine", requireAuth, validate(listJobApplicationsSchema), listMyJobApplications);
jobApplicationsRouter.post("/", requireAuth, validate(createJobApplicationSchema), createJobApplication);
jobApplicationsRouter.post(
  "/:jobApplicationId/promote",
  requireAuth,
  validate(promoteJobApplicationSchema),
  promoteJobApplication,
);
jobApplicationsRouter.post(
  "/:jobApplicationId/apply",
  requireAuth,
  validate(applyToJobApplicationSchema),
  applyToJobApplication,
);
jobApplicationsRouter.post(
  "/:jobApplicationId/submissions/:submissionId/promote",
  requireAuth,
  validate(promoteSubmissionSchema),
  promoteJobApplicationSubmission,
);
jobApplicationsRouter.get(
  "/:jobApplicationId/submissions",
  requireAuth,
  validate(listMySubmissionsSchema),
  listSubmissionsForMyListing,
);

