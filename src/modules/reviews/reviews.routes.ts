import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
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

reviewsRouter.get("/", requireAuth, validate(listReviewsSchema), asyncRoute(listReviews));
reviewsRouter.get("/:reviewId", requireAuth, validate(getReviewByIdSchema), asyncRoute(getReviewById));
reviewsRouter.post("/", requireAuth, validate(createReviewSchema), asyncRoute(createReview));
reviewsRouter.patch("/:reviewId", requireAuth, validate(updateReviewSchema), asyncRoute(updateReview));
reviewsRouter.patch("/:reviewId/status", requireAuth, validate(changeReviewStatusSchema), asyncRoute(changeReviewStatus));
reviewsRouter.delete("/:reviewId", requireAuth, validate(deleteReviewSchema), asyncRoute(deleteReview));
reviewsRouter.post("/:reviewId/restore", requireAuth, validate(restoreReviewSchema), asyncRoute(restoreReview));

