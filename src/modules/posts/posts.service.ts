import { PostStatus, type UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { PostsRepository } from "./posts.repository.js";
import {
  changePostStatusSchema,
  createPostSchema,
  listPostsSchema,
  updatePostSchema,
} from "./posts.validator.js";

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

type ListPostsQuery = z.infer<typeof listPostsSchema>["query"];
type CreatePostBody = z.infer<typeof createPostSchema>["body"];
type UpdatePostBody = z.infer<typeof updatePostSchema>["body"];
type ChangePostStatusBody = z.infer<typeof changePostStatusSchema>["body"];

const repo = new PostsRepository();

const allowedTransitions: Record<PostStatus, PostStatus[]> = {
  OPEN: [PostStatus.ASSIGNED, PostStatus.CANCELLED, PostStatus.EXPIRED],
  ASSIGNED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
	throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function assertCompanyUser(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN && auth.role !== Roles.COMPANY_DRIVER) {
	throw new AppError(403, "FORBIDDEN", "Only company users can access posts");
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

	return repo.create({
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

	return repo.update(postId, {
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


