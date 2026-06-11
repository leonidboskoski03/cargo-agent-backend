import { PostStatus } from "@prisma/client";
import { UsageService } from "../../shared/billing/usage.service.js";
import { companyCreditsConfig } from "../../config/companyCredits.js";
import { spendCompanyCredits, useCompanyActivePostQuotaOrCredits } from "../../shared/credits/marketplaceCredits.js";
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
const usageService = new UsageService();

const allowedTransitions: Record<PostStatus, PostStatus[]> = {
  OPEN: [PostStatus.ASSIGNED, PostStatus.CANCELLED, PostStatus.EXPIRED],
  ASSIGNED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function boostedUntilFrom(existing?: Date | null) {
  const now = new Date();
  const base = existing && existing > now ? existing : now;
  return new Date(base.getTime() + companyCreditsConfig.marketplaceBoostDurationDays * 24 * 60 * 60 * 1000);
}


export class PostsService {
  async list(auth: AuthContext, query: ListPostsQuery) {
	requireAuth(auth);
	assertCompanyUser(auth);
	const companyId = auth.companyId;

	if (!companyId) {
	  throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
	}

	if (query.scope === "mine") {
	  return repo.listActiveByCompany({
		companyId,
		status: query.status,
	  });
	}

	return repo.listMarketplace({
	  companyId,
	});
  }

  async getById(auth: AuthContext, postId: string) {
	requireAuth(auth);
	assertCompanyUser(auth);

	const post = await repo.findActiveById(postId);
	if (!post) {
	  throw new AppError(404, "POST_NOT_FOUND", "Post not found");
	}

	if (post.companyId !== auth.companyId && post.status !== PostStatus.OPEN) {
	  throw new AppError(403, "FORBIDDEN", "Only open marketplace posts can be accessed outside your company");
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

	const route = await repo.findActiveRouteById(body.routeId, companyId);
	if (!route) {
	  throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
	}

	if (body.priceType !== "REQUEST_QUOTE" && body.priceAmount === undefined) {
	  throw new AppError(400, "PRICE_REQUIRED", "priceAmount is required for FIXED and NEGOTIABLE posts");
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
	  isPromoted: false,
	});

	const billing = await useCompanyActivePostQuotaOrCredits({
	  companyId,
	  creditCost: companyCreditsConfig.transportPostCreditCost,
	  reasonCode: "TRANSPORT_POST_PUBLISH",
	  referenceId: created.id,
	  referenceType: "POST",
	});

	return { ...created, billing };
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
	  const route = await repo.findActiveRouteById(body.routeId, existing.companyId);
	  if (!route) {
		throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found");
	  }
	}

	const effectivePriceType = body.priceType ?? existing.priceType;
	const effectivePriceAmount = body.priceAmount === undefined ? existing.priceAmount : body.priceAmount;
	if (effectivePriceType !== "REQUEST_QUOTE" && (effectivePriceAmount === null || effectivePriceAmount === undefined)) {
	  throw new AppError(400, "PRICE_REQUIRED", "priceAmount is required for FIXED and NEGOTIABLE posts");
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
	});

	return updated;
  }

  async boost(auth: AuthContext, postId: string) {
	requireAuth(auth);
	assertCompanyAdmin(auth);

	const existing = await repo.findActiveById(postId);
	if (!existing) {
	  throw new AppError(404, "POST_NOT_FOUND", "Post not found");
	}

	if (existing.companyId !== auth.companyId) {
	  throw new AppError(403, "FORBIDDEN", "You can only boost posts from your company");
	}

	if (existing.status !== PostStatus.OPEN) {
	  throw new AppError(409, "POST_NOT_BOOSTABLE", "Only OPEN posts can be boosted");
	}

	const walletBalanceCredits = await spendCompanyCredits({
	  companyId: existing.companyId,
	  creditCost: companyCreditsConfig.postBoostCreditCost,
	  reasonCode: "TRANSPORT_POST_BOOST",
	  referenceId: postId,
	  referenceType: "POST",
	});
	const promotedUntil = boostedUntilFrom(existing.promotedUntil);
	const boosted = await repo.boost(postId, promotedUntil);
	await usageService.incrementMonthlyUsage(existing.companyId, "PROMOTED_POSTS_PER_MONTH");

	return {
	  ...boosted,
	  billing: {
		creditCost: companyCreditsConfig.postBoostCreditCost,
		mode: "CREDITS" as const,
		walletBalanceCredits,
	  },
	};
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

