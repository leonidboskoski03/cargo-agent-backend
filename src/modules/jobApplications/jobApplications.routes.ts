import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  applyToJobApplication,
  createJobApplication,
  createSubmissionReply,
  deleteJobApplication,
  deleteSubmissionReply,
  listJobApplicationFeed,
  listMyJobApplications,
  listSubmissionReplies,
  listSubmissionsForMyListing,
  promoteJobApplication,
  promoteJobApplicationSubmission,
  restoreJobApplication,
  updateJobApplication,
} from "./jobApplications.controller.js";
import {
  applyToJobApplicationSchema,
  createSubmissionReplySchema,
  createJobApplicationSchema,
  deleteSubmissionReplySchema,
  listJobApplicationsSchema,
  listMySubmissionsSchema,
  mutateJobApplicationSchema,
  promoteJobApplicationSchema,
  promoteSubmissionSchema,
  submissionRepliesSchema,
  updateJobApplicationSchema,
} from "./jobApplications.validator.js";

export const jobApplicationsRouter = Router();

jobApplicationsRouter.get("/", requireAuth, validate(listJobApplicationsSchema), asyncRoute(listJobApplicationFeed));
jobApplicationsRouter.get("/mine", requireAuth, validate(listJobApplicationsSchema), asyncRoute(listMyJobApplications));
jobApplicationsRouter.post("/", requireAuth, validate(createJobApplicationSchema), asyncRoute(createJobApplication));
jobApplicationsRouter.get(
  "/submissions/:submissionId/replies",
  requireAuth,
  validate(submissionRepliesSchema),
  asyncRoute(listSubmissionReplies),
);
jobApplicationsRouter.post(
  "/submissions/:submissionId/replies",
  requireAuth,
  validate(createSubmissionReplySchema),
  asyncRoute(createSubmissionReply),
);
jobApplicationsRouter.delete(
  "/submissions/:submissionId/replies/:replyId",
  requireAuth,
  validate(deleteSubmissionReplySchema),
  asyncRoute(deleteSubmissionReply),
);
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

