import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { ReviewsService } from "./reviews.service.js";

const service = new ReviewsService();


export async function listReviews(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    status: req.query.status as never,
    contractId: typeof req.query.contractId === "string" ? req.query.contractId : undefined,
  });

  return ok(res, data);
}

export async function getReviewById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.reviewId));
  return ok(res, data);
}

export async function createReview(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    contractId: req.body.contractId,
    rating: req.body.rating,
    comment: req.body.comment,
    status: req.body.status,
  });

  return created(res, data);
}

export async function updateReview(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.reviewId), {
    rating: req.body.rating,
    comment: req.body.comment,
  });

  return ok(res, data);
}

export async function changeReviewStatus(req: Request, res: Response) {
  const data = await service.changeStatus(authFromRequest(req), getStringParam(req.params.reviewId), {
    status: req.body.status,
  });

  return ok(res, data);
}

export async function deleteReview(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.reviewId));
  return ok(res, data);
}

export async function restoreReview(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.reviewId));
  return ok(res, data);
}

