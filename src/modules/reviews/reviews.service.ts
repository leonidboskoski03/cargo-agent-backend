import { ContractStatus, ReviewStatus, type UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import { enqueueNotificationEvent } from "../../shared/queue/notificationEvents.queue.js";
import { assertCompanyAdmin, assertCompanyUser, requireAuth } from "./reviews.helpers.js";
import { ReviewsRepository } from "./reviews.repository.js";
import type {
  AuthContext,
  ChangeReviewStatusBody,
  CreateReviewBody,
  ListReviewsQuery,
  UpdateReviewBody,
} from "./reviews.types.js";

const repo = new ReviewsRepository();

const allowedTransitions: Record<ReviewStatus, ReviewStatus[]> = {
  DRAFT: [ReviewStatus.PUBLISHED, ReviewStatus.WITHDRAWN],
  PUBLISHED: [ReviewStatus.WITHDRAWN],
  WITHDRAWN: [],
};


export class ReviewsService {
  async list(auth: AuthContext, query: ListReviewsQuery) {
    requireAuth(auth);
    assertCompanyUser(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
    }

    const reviews = await repo.listByCompanyInvolvement({
      companyId,
      status: query.status,
      contractId: query.contractId,
    });

    return reviews.filter((review) => {
      if (review.status !== ReviewStatus.DRAFT) {
        return true;
      }

      return review.reviewerCompanyId === auth.companyId;
    });
  }

  async getById(auth: AuthContext, reviewId: string) {
    requireAuth(auth);
    assertCompanyUser(auth);

    const review = await repo.findActiveById(reviewId);
    if (!review) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
    }

    const involved = review.reviewerCompanyId === auth.companyId || review.targetCompanyId === auth.companyId;
    if (!involved) {
      throw new AppError(403, "FORBIDDEN", "You can only access reviews in your company context");
    }

    if (review.status === ReviewStatus.DRAFT && review.reviewerCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "Draft reviews are only visible to the reviewer company");
    }

    return review;
  }

  async create(auth: AuthContext, body: CreateReviewBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const contract = await repo.findActiveContractById(body.contractId);
    if (!contract) {
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    if (contract.status !== ContractStatus.COMPLETED) {
      throw new AppError(409, "CONTRACT_NOT_COMPLETED", "Reviews can only be created for COMPLETED contracts");
    }

    const isShipper = contract.shipperCompanyId === companyId;
    const isCarrier = contract.carrierCompanyId === companyId;

    if (!isShipper && !isCarrier) {
      throw new AppError(403, "FORBIDDEN", "You can only review contracts your company participated in");
    }

    const targetCompanyId = isShipper ? contract.carrierCompanyId : contract.shipperCompanyId;

    try {
      return await repo.create({
        contractId: contract.id,
        reviewerCompanyId: companyId,
        reviewerUserId: auth.userId,
        targetCompanyId,
        rating: body.rating,
        comment: body.comment,
        status: body.status ?? ReviewStatus.DRAFT,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "REVIEW_ALREADY_EXISTS", "Your company already has a review for this contract");
      }

      throw error;
    }
  }

  async update(auth: AuthContext, reviewId: string, body: UpdateReviewBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const review = await repo.findActiveById(reviewId);
    if (!review) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
    }

    if (review.reviewerCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only edit reviews created by your company");
    }

    if (review.status !== ReviewStatus.DRAFT) {
      throw new AppError(409, "REVIEW_NOT_EDITABLE", "Only DRAFT reviews can be edited");
    }

    return repo.update(reviewId, {
      rating: body.rating,
      comment: body.comment,
    });
  }

  async changeStatus(auth: AuthContext, reviewId: string, body: ChangeReviewStatusBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const review = await repo.findActiveById(reviewId);
    if (!review) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
    }

    if (review.reviewerCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only change status for reviews created by your company");
    }

    if (review.status === body.status) {
      return review;
    }

    const allowed = allowedTransitions[review.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw new AppError(
        409,
        "INVALID_REVIEW_STATUS_TRANSITION",
        `Cannot change review status from ${review.status} to ${body.status}`,
      );
    }

    const updated = await repo.updateStatus(reviewId, body.status);

    if (body.status === ReviewStatus.PUBLISHED) {
      await enqueueNotificationEvent({
        type: "REVIEW_PUBLISHED",
        reviewId,
      });
    }

    return updated;
  }

  async remove(auth: AuthContext, reviewId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const review = await repo.findActiveById(reviewId);
    if (!review) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
    }

    if (review.reviewerCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only delete reviews created by your company");
    }

    return repo.softDelete(reviewId);
  }

  async restore(auth: AuthContext, reviewId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const review = await repo.findAnyById(reviewId);
    if (!review) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
    }

    if (review.reviewerCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only restore reviews created by your company");
    }

    if (!review.deletedAt) {
      throw new AppError(400, "REVIEW_NOT_DELETED", "Review is already active");
    }

    return repo.restore(reviewId);
  }
}


