import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { enforceUsageLimit } from "../../shared/middleware/enforceUsageLimit.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  boostBid,
  changeBidStatus,
  createBid,
  createBidReply,
  deleteBid,
  deleteBidReply,
  getBidById,
  listBidActivities,
  listBidReplies,
  listBids,
  restoreBid,
  updateBid,
} from "./bids.controller.js";
import {
  boostBidSchema,
  bidRepliesSchema,
  changeBidStatusSchema,
  createBidReplySchema,
  createBidSchema,
  deleteBidReplySchema,
  deleteBidSchema,
  getBidByIdSchema,
  listBidsSchema,
  restoreBidSchema,
  updateBidSchema,
} from "./bids.validator.js";

export const bidsRouter = Router();

bidsRouter.get("/", requireAuth, validate(listBidsSchema), asyncRoute(listBids));
bidsRouter.get("/:bidId/activities", requireAuth, validate(getBidByIdSchema), asyncRoute(listBidActivities));
bidsRouter.get("/:bidId/replies", requireAuth, validate(bidRepliesSchema), asyncRoute(listBidReplies));
bidsRouter.post("/:bidId/replies", requireAuth, validate(createBidReplySchema), asyncRoute(createBidReply));
bidsRouter.delete("/:bidId/replies/:replyId", requireAuth, validate(deleteBidReplySchema), asyncRoute(deleteBidReply));
bidsRouter.get("/:bidId", requireAuth, validate(getBidByIdSchema), asyncRoute(getBidById));
bidsRouter.post("/", requireAuth, enforceUsageLimit("BIDS_PER_MONTH"), validate(createBidSchema), asyncRoute(createBid));
bidsRouter.patch("/:bidId", requireAuth, validate(updateBidSchema), asyncRoute(updateBid));
bidsRouter.patch("/:bidId/status", requireAuth, validate(changeBidStatusSchema), asyncRoute(changeBidStatus));
bidsRouter.post("/:bidId/boost", requireAuth, validate(boostBidSchema), asyncRoute(boostBid));
bidsRouter.delete("/:bidId", requireAuth, validate(deleteBidSchema), asyncRoute(deleteBid));
bidsRouter.post("/:bidId/restore", requireAuth, validate(restoreBidSchema), asyncRoute(restoreBid));
