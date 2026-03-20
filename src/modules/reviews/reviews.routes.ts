import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  changeReviewStatus,
  createReview,
  deleteReview,
  getReviewById,
  listReviews,
  restoreReview,
  updateReview,
} from "./reviews.controller.js";
import {
  changeReviewStatusSchema,
  createReviewSchema,
  deleteReviewSchema,
  getReviewByIdSchema,
  listReviewsSchema,
  restoreReviewSchema,
  updateReviewSchema,
} from "./reviews.validator.js";

export const reviewsRouter = Router();

reviewsRouter.get("/", requireAuth, validate(listReviewsSchema), listReviews);
reviewsRouter.get("/:reviewId", requireAuth, validate(getReviewByIdSchema), getReviewById);
reviewsRouter.post("/", requireAuth, validate(createReviewSchema), createReview);
reviewsRouter.patch("/:reviewId", requireAuth, validate(updateReviewSchema), updateReview);
reviewsRouter.patch("/:reviewId/status", requireAuth, validate(changeReviewStatusSchema), changeReviewStatus);
reviewsRouter.delete("/:reviewId", requireAuth, validate(deleteReviewSchema), deleteReview);
reviewsRouter.post("/:reviewId/restore", requireAuth, validate(restoreReviewSchema), restoreReview);

