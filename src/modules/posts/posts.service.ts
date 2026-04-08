import { PostStatus } from "@prisma/client";
import { EntitlementsService } from "../../shared/billing/entitlements.service.js";
import { UsageService } from "../../shared/billing/usage.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { assertCompanyAdmin, assertCompanyUser, requireAuth } from "./posts.helpers.js";
import { PostsRepository } from "./posts.repository.js";
import type {
  AuthContext,
  ChangePostStatusBody,
  CreatePostBody,
  ListPostsQuery,
  UpdatePostBody,
} from "./posts.types.js";

const repo = new PostsRepository();
const entitlementsService = new EntitlementsService();
const usageService = new UsageService();

const allowedTransitions: Record<PostStatus, PostStatus[]> = {
  OPEN: [PostStatus.ASSIGNED, PostStatus.CANCELLED, PostStatus.EXPIRED],
  ASSIGNED: [],
  CANCELLED: [],
  EXPIRED: [],
};


export class PostsService {
  async list(auth: AuthContext, query: ListPostsQuery) {
	requireAuth(auth);
	assertCompanyUser(auth);
	const companyId = auth.companyId;

	if (!companyId) {
	  throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
	}

	return repo.listActiveByCompany({
	  companyId,
	  status: query.status,
	});
  }

  async getById(auth: AuthContext, postId: string) {
	requireAuth(auth);
	assertCompanyUser(auth);

	const post = await repo.findActiveById(postId);
	if (!post) {
	  throw new AppError(404, "POST_NOT_FOUND", "Post not found");
	}

	if (post.companyId !== auth.companyId) {
	  throw new AppError(403, "FORBIDDEN", "You can only access posts from your company");
	}

	return post;
  }

  async create(auth: AuthContext, body: CreatePostBody) {
	requireAuth(auth);
	assertCompanyAdmin(auth);
	const companyId = auth.companyId;

	if (!companyId) {
	  throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
	}

	const route = await repo.findActiveRouteById(body.routeId);
	if (!route) {
	  throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
	}

	if (body.priceType !== "REQUEST_QUOTE" && body.priceAmount === undefined) {
	  throw new AppError(400, "PRICE_REQUIRED", "priceAmount is required for FIXED and NEGOTIABLE posts");
	}

	const wantsPromoted = Boolean(body.isPromoted || body.promotedUntil);
	if (wantsPromoted) {
	  const feature = await entitlementsService.hasFeature(companyId, "PROMOTED_POSTS");
	  if (!feature.allowed) {
		throw new AppError(403, "PLAN_FEATURE_REQUIRED", "Your plan does not include this feature", {
		  feature: "PROMOTED_POSTS",
		  planCode: feature.entitlements.planCode,
		  companyId,
		});
	  }
	}

	const created = await repo.create({
	  companyId,
	  createdByUserId: auth.userId,
	  routeId: body.routeId,
	  title: body.title,
	  description: body.description,
	  pickupEarliestAt: body.pickupEarliestAt,
	  pickupLatestAt: body.pickupLatestAt,
	  deliveryDeadlineAt: body.deliveryDeadlineAt,
	  expiresAt: body.expiresAt,
	  cargoDescription: body.cargoDescription,
	  cargoType: body.cargoType,
	  weightKg: body.weightKg,
	  palletCount: body.palletCount,
	  volumeM3: body.volumeM3,
	  requiredBodyType: body.requiredBodyType,
	  hazmat: body.hazmat,
	  temperatureControlRequired: body.temperatureControlRequired,
	  temperatureMinC: body.temperatureMinC,
	  temperatureMaxC: body.temperatureMaxC,
	  priceType: body.priceType,
	  priceAmount: body.priceAmount,
	  currency: body.currency.toUpperCase(),
	  isPromoted: body.isPromoted,
	  promotedUntil: body.promotedUntil,
	});

	if (created.isPromoted) {
	  await usageService.incrementMonthlyUsage(companyId, "PROMOTED_POSTS_PER_MONTH");
	}

	return created;
  }

  async update(auth: AuthContext, postId: string, body: UpdatePostBody) {
	requireAuth(auth);
	assertCompanyAdmin(auth);

	const existing = await repo.findActiveById(postId);
	if (!existing) {
	  throw new AppError(404, "POST_NOT_FOUND", "Post not found");
	}

	if (existing.companyId !== auth.companyId) {
	  throw new AppError(403, "FORBIDDEN", "You can only manage posts from your company");
	}

	if (existing.status !== PostStatus.OPEN) {
	  throw new AppError(409, "POST_NOT_EDITABLE", "Only OPEN posts can be edited");
	}

	if (body.routeId) {
	  const route = await repo.findActiveRouteById(body.routeId);
	  if (!route) {
		throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
	  }
	}

	const effectivePriceType = body.priceType ?? existing.priceType;
	const effectivePriceAmount = body.priceAmount === undefined ? existing.priceAmount : body.priceAmount;
	if (effectivePriceType !== "REQUEST_QUOTE" && (effectivePriceAmount === null || effectivePriceAmount === undefined)) {
	  throw new AppError(400, "PRICE_REQUIRED", "priceAmount is required for FIXED and NEGOTIABLE posts");
	}

	const nextIsPromoted = body.isPromoted ?? existing.isPromoted;
	const nextPromotedUntil = body.promotedUntil === undefined ? existing.promotedUntil : body.promotedUntil;
	const wantsPromoted = Boolean(nextIsPromoted || nextPromotedUntil);

	if (wantsPromoted) {
	  const feature = await entitlementsService.hasFeature(existing.companyId, "PROMOTED_POSTS");
	  if (!feature.allowed) {
		throw new AppError(403, "PLAN_FEATURE_REQUIRED", "Your plan does not include this feature", {
		  feature: "PROMOTED_POSTS",
		  planCode: feature.entitlements.planCode,
		  companyId: existing.companyId,
		});
	  }
	}

	const updated = await repo.update(postId, {
	  routeId: body.routeId,
	  title: body.title,
	  description: body.description,
	  pickupEarliestAt: body.pickupEarliestAt,
	  pickupLatestAt: body.pickupLatestAt,
	  deliveryDeadlineAt: body.deliveryDeadlineAt,
	  expiresAt: body.expiresAt,
	  cargoDescription: body.cargoDescription,
	  cargoType: body.cargoType,
	  weightKg: body.weightKg,
	  palletCount: body.palletCount,
	  volumeM3: body.volumeM3,
	  requiredBodyType: body.requiredBodyType,
	  hazmat: body.hazmat,
	  temperatureControlRequired: body.temperatureControlRequired,
	  temperatureMinC: body.temperatureMinC,
	  temperatureMaxC: body.temperatureMaxC,
	  priceType: body.priceType,
	  priceAmount: body.priceAmount,
	  currency: body.currency?.toUpperCase(),
	  isPromoted: body.isPromoted,
	  promotedUntil: body.promotedUntil,
	});

	if (!existing.isPromoted && updated.isPromoted) {
	  await usageService.incrementMonthlyUsage(existing.companyId, "PROMOTED_POSTS_PER_MONTH");
	}

	return updated;
  }

  async changeStatus(auth: AuthContext, postId: string, body: ChangePostStatusBody) {
	requireAuth(auth);
	assertCompanyAdmin(auth);

	const existing = await repo.findActiveById(postId);
	if (!existing) {
	  throw new AppError(404, "POST_NOT_FOUND", "Post not found");
	}

	if (existing.companyId !== auth.companyId) {
	  throw new AppError(403, "FORBIDDEN", "You can only manage posts from your company");
	}

	if (existing.status === body.status) {
	  return existing;
	}

	const allowed = allowedTransitions[existing.status] ?? [];
	if (!allowed.includes(body.status)) {
	  throw new AppError(409, "INVALID_POST_STATUS_TRANSITION", `Cannot change post status from ${existing.status} to ${body.status}`);
	}

	return repo.updateStatus(postId, body.status);
  }

  async remove(auth: AuthContext, postId: string) {
	requireAuth(auth);
	assertCompanyAdmin(auth);

	const existing = await repo.findActiveById(postId);
	if (!existing) {
	  throw new AppError(404, "POST_NOT_FOUND", "Post not found");
	}

	if (existing.companyId !== auth.companyId) {
	  throw new AppError(403, "FORBIDDEN", "You can only manage posts from your company");
	}

	return repo.softDelete(postId);
  }

  async restore(auth: AuthContext, postId: string) {
	requireAuth(auth);
	assertCompanyAdmin(auth);

	const existing = await repo.findAnyById(postId);
	if (!existing) {
	  throw new AppError(404, "POST_NOT_FOUND", "Post not found");
	}

	if (existing.companyId !== auth.companyId) {
	  throw new AppError(403, "FORBIDDEN", "You can only manage posts from your company");
	}

	if (!existing.deletedAt) {
	  throw new AppError(400, "POST_NOT_DELETED", "Post is already active");
	}

	return repo.restore(postId);
  }
}

