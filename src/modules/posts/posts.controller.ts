import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { PostsService } from "./posts.service.js";

const service = new PostsService();


export async function listPosts(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
	scope: req.query.scope as never,
	status: req.query.status as never,
  });

  return ok(res, data);
}

export async function getPostById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.postId));
  return ok(res, data);
}

export async function createPost(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
	routeId: req.body.routeId,
	title: req.body.title,
	description: req.body.description,
	pickupEarliestAt: req.body.pickupEarliestAt,
	pickupLatestAt: req.body.pickupLatestAt,
	deliveryDeadlineAt: req.body.deliveryDeadlineAt,
	expiresAt: req.body.expiresAt,
	cargoDescription: req.body.cargoDescription,
	cargoType: req.body.cargoType,
	weightKg: req.body.weightKg,
	palletCount: req.body.palletCount,
	volumeM3: req.body.volumeM3,
	requiredBodyType: req.body.requiredBodyType,
	hazmat: req.body.hazmat,
	temperatureControlRequired: req.body.temperatureControlRequired,
	temperatureMinC: req.body.temperatureMinC,
	temperatureMaxC: req.body.temperatureMaxC,
	priceType: req.body.priceType,
	priceAmount: req.body.priceAmount,
	currency: req.body.currency,
	isPromoted: req.body.isPromoted,
	promotedUntil: req.body.promotedUntil,
  });

  return created(res, data);
}

export async function updatePost(req: Request, res: Response) {
  const data = await service.update(authFromRequest(req), getStringParam(req.params.postId), {
	routeId: req.body.routeId,
	title: req.body.title,
	description: req.body.description,
	pickupEarliestAt: req.body.pickupEarliestAt,
	pickupLatestAt: req.body.pickupLatestAt,
	deliveryDeadlineAt: req.body.deliveryDeadlineAt,
	expiresAt: req.body.expiresAt,
	cargoDescription: req.body.cargoDescription,
	cargoType: req.body.cargoType,
	weightKg: req.body.weightKg,
	palletCount: req.body.palletCount,
	volumeM3: req.body.volumeM3,
	requiredBodyType: req.body.requiredBodyType,
	hazmat: req.body.hazmat,
	temperatureControlRequired: req.body.temperatureControlRequired,
	temperatureMinC: req.body.temperatureMinC,
	temperatureMaxC: req.body.temperatureMaxC,
	priceType: req.body.priceType,
	priceAmount: req.body.priceAmount,
	currency: req.body.currency,
	isPromoted: req.body.isPromoted,
	promotedUntil: req.body.promotedUntil,
  });

  return ok(res, data);
}

export async function changePostStatus(req: Request, res: Response) {
  const data = await service.changeStatus(authFromRequest(req), getStringParam(req.params.postId), {
	status: req.body.status,
  });

  return ok(res, data);
}

export async function boostPost(req: Request, res: Response) {
  const data = await service.boost(authFromRequest(req), getStringParam(req.params.postId));
  return ok(res, data);
}

export async function deletePost(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.postId));
  return ok(res, data);
}

export async function restorePost(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.postId));
  return ok(res, data);
}

