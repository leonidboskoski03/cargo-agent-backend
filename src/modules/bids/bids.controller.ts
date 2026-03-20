import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { BidsService } from "./bids.service.js";

const service = new BidsService();

function authFromRequest(req: Request) {
  return req.auth ? { userId: req.auth.sub, role: req.auth.role, companyId: req.auth.companyId } : {};
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function listBids(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    status: req.query.status as never,
    postId: typeof req.query.postId === "string" ? req.query.postId : undefined,
  });

  return ok(res, data);
}

export async function getBidById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.bidId));
  return ok(res, data);
}

export async function createBid(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    postId: req.body.postId,
    message: req.body.message,
    offeredPriceAmount: req.body.offeredPriceAmount,
    currency: req.body.currency,
    estimatedPickupAt: req.body.estimatedPickupAt,
    estimatedDeliveryAt: req.body.estimatedDeliveryAt,
  });

  return created(res, data);
}

export async function updateBid(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.bidId), {
    message: req.body.message,
    offeredPriceAmount: req.body.offeredPriceAmount,
    currency: req.body.currency,
    estimatedPickupAt: req.body.estimatedPickupAt,
    estimatedDeliveryAt: req.body.estimatedDeliveryAt,
  });

  return ok(res, data);
}

export async function changeBidStatus(req: Request, res: Response) {
  const data = await service.changeStatus(authFromRequest(req), getStringParam(req.params.bidId), {
    status: req.body.status,
  });

  return ok(res, data);
}

export async function deleteBid(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.bidId));
  return ok(res, data);
}

export async function restoreBid(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.bidId));
  return ok(res, data);
}

