import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
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

bidsRouter.get("/", requireAuth, validate(listBidsSchema), listBids);
bidsRouter.get("/:bidId", requireAuth, validate(getBidByIdSchema), getBidById);
bidsRouter.post("/", requireAuth, validate(createBidSchema), createBid);
bidsRouter.patch("/:bidId", requireAuth, validate(updateBidSchema), updateBid);
bidsRouter.patch("/:bidId/status", requireAuth, validate(changeBidStatusSchema), changeBidStatus);
bidsRouter.delete("/:bidId", requireAuth, validate(deleteBidSchema), deleteBid);
bidsRouter.post("/:bidId/restore", requireAuth, validate(restoreBidSchema), restoreBid);

