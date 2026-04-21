import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { enforceUsageLimit } from "../../shared/middleware/enforceUsageLimit.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  changeBidStatus,
  createBid,
  deleteBid,
  getBidById,
  listBids,
  restoreBid,
  updateBid,
} from "./bids.controller.js";
import {
  changeBidStatusSchema,
  createBidSchema,
  deleteBidSchema,
  getBidByIdSchema,
  listBidsSchema,
  restoreBidSchema,
  updateBidSchema,
} from "./bids.validator.js";

export const bidsRouter = Router();

bidsRouter.get("/", requireAuth, validate(listBidsSchema), asyncRoute(listBids));
bidsRouter.get("/:bidId", requireAuth, validate(getBidByIdSchema), asyncRoute(getBidById));
bidsRouter.post("/", requireAuth, enforceUsageLimit("BIDS_PER_MONTH"), validate(createBidSchema), asyncRoute(createBid));
bidsRouter.patch("/:bidId", requireAuth, validate(updateBidSchema), asyncRoute(updateBid));
bidsRouter.patch("/:bidId/status", requireAuth, validate(changeBidStatusSchema), asyncRoute(changeBidStatus));
bidsRouter.delete("/:bidId", requireAuth, validate(deleteBidSchema), asyncRoute(deleteBid));
bidsRouter.post("/:bidId/restore", requireAuth, validate(restoreBidSchema), asyncRoute(restoreBid));
