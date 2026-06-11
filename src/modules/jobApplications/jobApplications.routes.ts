import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  applyToJobApplication,
  createJobApplication,
  deleteJobApplication,
  listJobApplicationFeed,
  listMyJobApplications,
  listSubmissionsForMyListing,
  promoteJobApplication,
  promoteJobApplicationSubmission,
  restoreJobApplication,
  updateJobApplication,
} from "./jobApplications.controller.js";
import {
  applyToJobApplicationSchema,
  createJobApplicationSchema,
  listJobApplicationsSchema,
  listMySubmissionsSchema,
  mutateJobApplicationSchema,
  promoteJobApplicationSchema,
  promoteSubmissionSchema,
  updateJobApplicationSchema,
} from "./jobApplications.validator.js";

export const jobApplicationsRouter = Router();

jobApplicationsRouter.get("/", requireAuth, validate(listJobApplicationsSchema), asyncRoute(listJobApplicationFeed));
jobApplicationsRouter.get("/mine", requireAuth, validate(listJobApplicationsSchema), asyncRoute(listMyJobApplications));
jobApplicationsRouter.post("/", requireAuth, validate(createJobApplicationSchema), asyncRoute(createJobApplication));
jobApplicationsRouter.patch("/:jobApplicationId", requireAuth, validate(updateJobApplicationSchema), asyncRoute(updateJobApplication));
jobApplicationsRouter.delete("/:jobApplicationId", requireAuth, validate(mutateJobApplicationSchema), asyncRoute(deleteJobApplication));
jobApplicationsRouter.post("/:jobApplicationId/restore", requireAuth, validate(mutateJobApplicationSchema), asyncRoute(restoreJobApplication));
jobApplicationsRouter.post(
  "/:jobApplicationId/promote",
  requireAuth,
  validate(promoteJobApplicationSchema),
  asyncRoute(promoteJobApplication),
);
jobApplicationsRouter.post(
  "/:jobApplicationId/apply",
  requireAuth,
  validate(applyToJobApplicationSchema),
  asyncRoute(applyToJobApplication),
);
jobApplicationsRouter.post(
  "/:jobApplicationId/submissions/:submissionId/promote",
  requireAuth,
  validate(promoteSubmissionSchema),
  asyncRoute(promoteJobApplicationSubmission),
);
jobApplicationsRouter.get(
  "/:jobApplicationId/submissions",
  requireAuth,
  validate(listMySubmissionsSchema),
  asyncRoute(listSubmissionsForMyListing),
);

