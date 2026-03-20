import { PostPriceType, PostStatus, Prisma, VehicleBodyType } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListFilters = {
  companyId: string;
  status?: PostStatus;
};

type CreatePostData = {
  companyId: string;
  createdByUserId: string;
  routeId: string;
  title?: string;
  description?: string;
  pickupEarliestAt?: Date;
  pickupLatestAt?: Date;
  deliveryDeadlineAt?: Date;
  expiresAt?: Date;
  cargoDescription?: string;
  cargoType?: string;
  weightKg?: number;
  palletCount?: number;
  volumeM3?: Prisma.Decimal | string | number;
  requiredBodyType?: VehicleBodyType;
  hazmat?: boolean;
  temperatureControlRequired?: boolean;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  priceType: PostPriceType;
  priceAmount?: Prisma.Decimal | string | number;
  currency: string;
  isPromoted?: boolean;
  promotedUntil?: Date;
};

type UpdatePostData = {
  routeId?: string;
  title?: string | null;
  description?: string | null;
  pickupEarliestAt?: Date | null;
  pickupLatestAt?: Date | null;
  deliveryDeadlineAt?: Date | null;
  expiresAt?: Date | null;
  cargoDescription?: string | null;
  cargoType?: string | null;
  weightKg?: number | null;
  palletCount?: number | null;
  volumeM3?: Prisma.Decimal | string | number | null;
  requiredBodyType?: VehicleBodyType | null;
  hazmat?: boolean;
  temperatureControlRequired?: boolean;
  temperatureMinC?: number | null;
  temperatureMaxC?: number | null;
  priceType?: PostPriceType;
  priceAmount?: Prisma.Decimal | string | number | null;
  currency?: string;
  isPromoted?: boolean;
  promotedUntil?: Date | null;
};

const postSelect = {
  id: true,
  companyId: true,
  createdByUserId: true,
  routeId: true,
  title: true,
  description: true,
  pickupEarliestAt: true,
  pickupLatestAt: true,
  deliveryDeadlineAt: true,
  expiresAt: true,
  cargoDescription: true,
  cargoType: true,
  weightKg: true,
  palletCount: true,
  volumeM3: true,
  requiredBodyType: true,
  hazmat: true,
  temperatureControlRequired: true,
  temperatureMinC: true,
  temperatureMaxC: true,
  priceType: true,
  priceAmount: true,
  currency: true,
  status: true,
  isPromoted: true,
  promotedUntil: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PostsRepository {
  async listActiveByCompany(filters: ListFilters) {
	return prisma.post.findMany({
	  where: {
		companyId: filters.companyId,
		deletedAt: null,
		...(filters.status ? { status: filters.status } : {}),
	  },
	  orderBy: { createdAt: "desc" },
	  select: postSelect,
	});
  }

  async findActiveById(postId: string) {
	return prisma.post.findFirst({
	  where: {
		id: postId,
		deletedAt: null,
	  },
	  select: postSelect,
	});
  }

  async findAnyById(postId: string) {
	return prisma.post.findUnique({
	  where: { id: postId },
	  select: postSelect,
	});
  }

  async findActiveRouteById(routeId: string) {
	return prisma.route.findFirst({
	  where: {
		id: routeId,
		deletedAt: null,
	  },
	  select: { id: true },
	});
  }

  async create(data: CreatePostData) {
	return prisma.post.create({
	  data,
	  select: postSelect,
	});
  }

  async update(postId: string, data: UpdatePostData) {
	return prisma.post.update({
	  where: { id: postId },
	  data,
	  select: postSelect,
	});
  }

  async updateStatus(postId: string, status: PostStatus) {
	return prisma.post.update({
	  where: { id: postId },
	  data: { status },
	  select: postSelect,
	});
  }

  async softDelete(postId: string) {
	return prisma.post.update({
	  where: { id: postId },
	  data: { deletedAt: new Date() },
	  select: postSelect,
	});
  }

  async restore(postId: string) {
	return prisma.post.update({
	  where: { id: postId },
	  data: { deletedAt: null },
	  select: postSelect,
	});
  }
}

