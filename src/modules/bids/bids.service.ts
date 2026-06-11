import { BidActivityType, BidStatus, PostStatus, type UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import { writeAuditEvent } from "../../shared/audit/auditLogger.js";
import { enqueueNotificationEvent } from "../../shared/queue/notificationEvents.queue.js";
import { UsageService } from "../../shared/billing/usage.service.js";
import { companyCreditsConfig } from "../../config/companyCredits.js";
import { spendCompanyCredits } from "../../shared/credits/marketplaceCredits.js";
import { BidsRepository } from "./bids.repository.js";
import { assertCompanyAdmin, assertCompanyUser, requireAuth } from "./bids.helpers.js";
import type {
  AuthContext,
  BoostBidBody,
  ChangeBidStatusBody,
  CreateBidBody,
  ListBidsQuery,
  UpdateBidBody,
} from "./bids.types.js";

const repo = new BidsRepository();
const usageService = new UsageService();

const allowedTransitions: Record<BidStatus, BidStatus[]> = {
  PENDING: [BidStatus.ACCEPTED, BidStatus.REJECTED, BidStatus.WITHDRAWN],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

function boostedUntilFrom(existing?: Date | null) {
  const now = new Date();
  const base = existing && existing > now ? existing : now;
  return new Date(base.getTime() + companyCreditsConfig.marketplaceBoostDurationDays * 24 * 60 * 60 * 1000);
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
      scope: query.scope,
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

  async listActivities(auth: AuthContext, bidId: string) {
    requireAuth(auth);
    assertCompanyUser(auth);

    const bid = await repo.findActiveById(bidId);
    if (!bid) {
      throw new AppError(404, "BID_NOT_FOUND", "Bid not found");
    }

    if (bid.carrierCompanyId !== auth.companyId && bid.post.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only access bid activity in your company context");
    }

    return repo.listActivities(bidId);
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

    const usage = await usageService.getUsage(companyId, "BIDS_PER_MONTH");

    try {
      const created = await repo.createWithMonthlyUsageReservation({
        periodStart: usage.periodStart,
        limit: usage.limit,
        planCode: usage.planCode,
        data: {
          postId: body.postId,
          carrierCompanyId: companyId,
          createdByUserId: auth.userId,
          message: body.message,
          offeredPriceAmount: body.offeredPriceAmount,
          currency: body.currency.toUpperCase(),
          estimatedPickupAt: body.estimatedPickupAt,
          estimatedDeliveryAt: body.estimatedDeliveryAt,
        },
      });

      await enqueueNotificationEvent({
        type: "BID_SUBMITTED",
        bidId: created.id,
      });
      await repo.createActivity({
        actorCompanyId: companyId,
        actorUserId: auth.userId,
        bidId: created.id,
        message: "Bid submitted",
        metadataJson: { postId: body.postId, offeredPriceAmount: body.offeredPriceAmount, currency: body.currency.toUpperCase() },
        type: BidActivityType.CREATED,
      });

      return created;
    } catch (error) {
      if (error instanceof Error && error.message === "BID_MONTHLY_LIMIT_REACHED") {
        throw new AppError(403, "USAGE_LIMIT_REACHED", "Plan usage limit reached", {
          metric: "BIDS_PER_MONTH",
          planCode: usage.planCode,
          used: usage.used,
          limit: usage.limit,
          periodStart: usage.periodStart,
          companyId,
        });
      }

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

    const updated = await repo.update(bidId, {
      message: body.message,
      offeredPriceAmount: body.offeredPriceAmount,
      currency: body.currency?.toUpperCase(),
      estimatedPickupAt: body.estimatedPickupAt,
      estimatedDeliveryAt: body.estimatedDeliveryAt,
    });
    await repo.createActivity({
      actorCompanyId: auth.companyId,
      actorUserId: auth.userId,
      bidId,
      message: "Bid updated",
      metadataJson: {
        currency: body.currency?.toUpperCase(),
        estimatedDeliveryAt: body.estimatedDeliveryAt,
        estimatedPickupAt: body.estimatedPickupAt,
        offeredPriceAmount: body.offeredPriceAmount,
      },
      type: BidActivityType.UPDATED,
    });

    return updated;
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

      const updated = await repo.updateStatus(bidId, BidStatus.WITHDRAWN);
      await repo.createActivity({
        actorCompanyId: auth.companyId,
        actorUserId: auth.userId,
        bidId,
        message: "Bid withdrawn",
        metadataJson: { postId: bid.postId },
        type: BidActivityType.WITHDRAWN,
      });

      return updated;
    }

    if (body.status === BidStatus.ACCEPTED || body.status === BidStatus.REJECTED) {
      if (bid.post.companyId !== auth.companyId) {
        throw new AppError(403, "FORBIDDEN", "Only the post owner company can accept or reject bids");
      }

      if (body.status === BidStatus.ACCEPTED) {
        if (!bid.offeredPriceAmount) {
          throw new AppError(400, "INVALID_BID_PRICE", "Accepted bid must include offeredPriceAmount");
        }

        const updated = await repo.acceptBidAndCreateContract({
          acceptedBidId: bidId,
          actorCompanyId: companyId,
          actorUserId: auth.userId,
          agreedPriceAmount: bid.offeredPriceAmount,
          carrierCompanyId: bid.carrierCompanyId,
          currency: bid.currency,
          postId: bid.postId,
          routeId: bid.post.routeId,
          shipperCompanyId: bid.post.companyId,
        });
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
        await repo.createActivity({
          actorCompanyId: companyId,
          actorUserId: auth.userId,
          bidId,
          message: "Bid accepted",
          metadataJson: { postId: bid.postId },
          type: BidActivityType.ACCEPTED,
        });
        if (!updated.contract?.id) {
          throw new AppError(500, "CONTRACT_CREATION_FAILED", "Accepted bid did not return a contract");
        }
        await writeAuditEvent({
          companyId,
          actorUserId: auth.userId,
          action: "CONTRACT_CREATED",
          entityType: "Contract",
          entityId: updated.contract.id,
          payloadJson: {
            postId: bid.postId,
            acceptedBidId: bidId,
          },
        });
        await enqueueNotificationEvent({
          type: "CONTRACT_CREATED",
          contractId: updated.contract.id,
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
      await enqueueNotificationEvent({
        type: "BID_REJECTED",
        bidId,
      });
      await repo.createActivity({
        actorCompanyId: companyId,
        actorUserId: auth.userId,
        bidId,
        message: "Bid rejected",
        metadataJson: { postId: bid.postId },
        type: BidActivityType.REJECTED,
      });

      return updated;
    }

    throw new AppError(403, "FORBIDDEN", "Unsupported status update");
  }

  async boost(auth: AuthContext, bidId: string, body: BoostBidBody) {
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

    if (bid.carrierCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "Only the bidding company can boost this bid");
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new AppError(409, "BID_NOT_BOOSTABLE", "Only PENDING bids can be boosted");
    }

    const walletBalanceCredits = await spendCompanyCredits({
      companyId,
      creditCost: body.creditAmount,
      reasonCode: "BID_BOOST",
      referenceId: bidId,
      referenceType: "BID",
    });
    const boostedUntil = boostedUntilFrom(bid.boostedUntil);
    const boosted = await repo.boostBid(bidId, {
      boostCredits: body.creditAmount,
      boostedUntil,
    });
    await repo.createActivity({
      actorCompanyId: companyId,
      actorUserId: auth.userId,
      bidId,
      message: "Bid boosted",
      metadataJson: { creditAmount: body.creditAmount, boostedUntil: boostedUntil.toISOString() },
      type: BidActivityType.BOOSTED,
    });

    return {
      ...boosted,
      billing: {
        creditCost: body.creditAmount,
        mode: "CREDITS" as const,
        walletBalanceCredits,
      },
    };
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

    const deleted = await repo.softDelete(bidId);
    await repo.createActivity({
      actorCompanyId: auth.companyId,
      actorUserId: auth.userId,
      bidId,
      message: "Bid deleted",
      metadataJson: { postId: bid.postId },
      type: BidActivityType.DELETED,
    });

    return deleted;
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

    const restored = await repo.restore(bidId);
    await repo.createActivity({
      actorCompanyId: auth.companyId,
      actorUserId: auth.userId,
      bidId,
      message: "Bid restored",
      metadataJson: { postId: bid.postId },
      type: BidActivityType.RESTORED,
    });

    return restored;
  }
}

