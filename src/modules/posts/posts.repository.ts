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
  company: {
    select: {
      id: true,
      name: true,
      city: true,
      countryCode: true,
      isVerified: true,
    },
  },
  route: {
    select: {
      id: true,
      distanceKm: true,
      estimatedDurationMinutes: true,
      originLocation: {
        select: {
          city: true,
          countryCode: true,
          region: true,
        },
      },
      destinationLocation: {
        select: {
          city: true,
          countryCode: true,
          region: true,
        },
      },
    },
  },
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

  async findActiveRouteById(routeId: string, companyId: string) {
	return prisma.route.findFirst({
	  where: {
		id: routeId,
		companyId,
		deletedAt: null,
	  },
	  select: { id: true, companyId: true },
	});
  }

  async listMarketplace(filters: { companyId: string }) {
	const now = new Date();
	return prisma.post.findMany({
	  where: {
		deletedAt: null,
		status: PostStatus.OPEN,
		companyId: { not: filters.companyId },
	  },
	  orderBy: [{ promotedUntil: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
	  select: postSelect,
	}).then((posts) =>
	  [...posts].sort((left, right) => {
		const leftActive = left.promotedUntil && left.promotedUntil > now ? 1 : 0;
		const rightActive = right.promotedUntil && right.promotedUntil > now ? 1 : 0;
		if (leftActive !== rightActive) return rightActive - leftActive;
		if (leftActive && rightActive) return (right.promotedUntil?.getTime() ?? 0) - (left.promotedUntil?.getTime() ?? 0);
		return right.createdAt.getTime() - left.createdAt.getTime();
	  }),
	);
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

  async boost(postId: string, promotedUntil: Date) {
	return prisma.post.update({
	  where: { id: postId },
	  data: { isPromoted: true, promotedUntil },
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

