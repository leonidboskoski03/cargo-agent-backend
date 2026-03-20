import { BidStatus, PostStatus, type UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { writeAuditEvent } from "../../shared/audit/auditLogger.js";
import { enqueueNotificationEvent } from "../../shared/queue/notificationEvents.queue.js";
import { BidsRepository } from "./bids.repository.js";
import {
  changeBidStatusSchema,
  createBidSchema,
  listBidsSchema,
  updateBidSchema,
} from "./bids.validator.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

type RequiredAuthContext = {
  userId: string;
  role: UserRole;
  companyId?: string;
};

type ListBidsQuery = z.infer<typeof listBidsSchema>["query"];
type CreateBidBody = z.infer<typeof createBidSchema>["body"];
type UpdateBidBody = z.infer<typeof updateBidSchema>["body"];
type ChangeBidStatusBody = z.infer<typeof changeBidStatusSchema>["body"];

const repo = new BidsRepository();

const allowedTransitions: Record<BidStatus, BidStatus[]> = {
  PENDING: [BidStatus.ACCEPTED, BidStatus.REJECTED, BidStatus.WITHDRAWN],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function assertCompanyUser(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN && auth.role !== Roles.COMPANY_DRIVER) {
    throw new AppError(403, "FORBIDDEN", "Only company users can access bids");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
  }
}

function assertCompanyAdmin(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can perform this action");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
  }
}

export class BidsService {
  async list(auth: AuthContext, query: ListBidsQuery) {
    requireAuth(auth);
    assertCompanyUser(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
    }

    return repo.listByCompanyInvolvement({
      companyId,
      status: query.status,
      postId: query.postId,
    });
  }

  async getById(auth: AuthContext, bidId: string) {
    requireAuth(auth);
    assertCompanyUser(auth);

    const bid = await repo.findActiveById(bidId);
    if (!bid) {
      throw new AppError(404, "BID_NOT_FOUND", "Bid not found");
    }

    if (bid.carrierCompanyId !== auth.companyId && bid.post.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only access bids in your company context");
    }

    return bid;
  }

  async create(auth: AuthContext, body: CreateBidBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const post = await repo.findActivePostById(body.postId);
    if (!post) {
      throw new AppError(404, "POST_NOT_FOUND", "Post not found");
    }

    if (post.status !== PostStatus.OPEN) {
      throw new AppError(409, "POST_NOT_OPEN", "Bids can only be created for OPEN posts");
    }

    if (post.companyId === auth.companyId) {
      throw new AppError(400, "OWN_POST_BID_FORBIDDEN", "You cannot place a bid on your own company post");
    }

    if (body.offeredPriceAmount === undefined || body.offeredPriceAmount === null) {
      throw new AppError(400, "PRICE_REQUIRED", "offeredPriceAmount is required");
    }

    try {
      return await repo.create({
        postId: body.postId,
        carrierCompanyId: companyId,
        createdByUserId: auth.userId,
        message: body.message,
        offeredPriceAmount: body.offeredPriceAmount,
        currency: body.currency.toUpperCase(),
        estimatedPickupAt: body.estimatedPickupAt,
        estimatedDeliveryAt: body.estimatedDeliveryAt,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "BID_ALREADY_EXISTS", "Your company already has a bid for this post");
      }

      throw error;
    }
  }

  async update(auth: AuthContext, bidId: string, body: UpdateBidBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const bid = await repo.findActiveById(bidId);
    if (!bid) {
      throw new AppError(404, "BID_NOT_FOUND", "Bid not found");
    }

    if (bid.carrierCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only update bids created by your company");
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new AppError(409, "BID_NOT_EDITABLE", "Only PENDING bids can be edited");
    }

    return repo.update(bidId, {
      message: body.message,
      offeredPriceAmount: body.offeredPriceAmount,
      currency: body.currency?.toUpperCase(),
      estimatedPickupAt: body.estimatedPickupAt,
      estimatedDeliveryAt: body.estimatedDeliveryAt,
    });
  }

  async changeStatus(auth: AuthContext, bidId: string, body: ChangeBidStatusBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const bid = await repo.findActiveById(bidId);
    if (!bid) {
      throw new AppError(404, "BID_NOT_FOUND", "Bid not found");
    }

    if (bid.status === body.status) {
      return bid;
    }

    const allowed = allowedTransitions[bid.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw new AppError(409, "INVALID_BID_STATUS_TRANSITION", `Cannot change bid status from ${bid.status} to ${body.status}`);
    }

    if (body.status === BidStatus.WITHDRAWN) {
      if (bid.carrierCompanyId !== auth.companyId) {
        throw new AppError(403, "FORBIDDEN", "Only the bidding company can withdraw this bid");
      }

      return repo.updateStatus(bidId, BidStatus.WITHDRAWN);
    }

    if (body.status === BidStatus.ACCEPTED || body.status === BidStatus.REJECTED) {
      if (bid.post.companyId !== auth.companyId) {
        throw new AppError(403, "FORBIDDEN", "Only the post owner company can accept or reject bids");
      }

      if (body.status === BidStatus.ACCEPTED) {
        const updated = await repo.acceptBidAndClosePost(bidId, bid.postId);
        await writeAuditEvent({
          companyId,
          actorUserId: auth.userId,
          action: "BID_ACCEPTED",
          entityType: "Bid",
          entityId: bidId,
          payloadJson: { postId: bid.postId },
        });
        await enqueueNotificationEvent({
          type: "BID_ACCEPTED",
          bidId,
        });

        return updated;
      }

      const updated = await repo.updateStatus(bidId, BidStatus.REJECTED);
      await writeAuditEvent({
        companyId,
        actorUserId: auth.userId,
        action: "BID_REJECTED",
        entityType: "Bid",
        entityId: bidId,
        payloadJson: { postId: bid.postId },
      });

      return updated;
    }

    throw new AppError(403, "FORBIDDEN", "Unsupported status update");
  }

  async remove(auth: AuthContext, bidId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const bid = await repo.findActiveById(bidId);
    if (!bid) {
      throw new AppError(404, "BID_NOT_FOUND", "Bid not found");
    }

    if (bid.carrierCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only delete bids from your company");
    }

    return repo.softDelete(bidId);
  }

  async restore(auth: AuthContext, bidId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const bid = await repo.findAnyById(bidId);
    if (!bid) {
      throw new AppError(404, "BID_NOT_FOUND", "Bid not found");
    }

    if (bid.carrierCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only restore bids from your company");
    }

    if (!bid.deletedAt) {
      throw new AppError(400, "BID_NOT_DELETED", "Bid is already active");
    }

    if (bid.post.status !== PostStatus.OPEN) {
      throw new AppError(409, "POST_NOT_OPEN", "Cannot restore bid because the post is no longer OPEN");
    }

    return repo.restore(bidId);
  }
}


