import { BidStatus, PlanCode, Prisma, UsageMetric } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListFilters = {
  companyId: string;
  status?: BidStatus;
  postId?: string;
};

type CreateBidData = {
  postId: string;
  carrierCompanyId: string;
  createdByUserId: string;
  message?: string;
  offeredPriceAmount?: Prisma.Decimal | string | number;
  currency: string;
  estimatedPickupAt?: Date;
  estimatedDeliveryAt?: Date;
};

type UpdateBidData = {
  message?: string | null;
  offeredPriceAmount?: Prisma.Decimal | string | number | null;
  currency?: string;
  estimatedPickupAt?: Date | null;
  estimatedDeliveryAt?: Date | null;
};

const bidSelect = {
  id: true,
  postId: true,
  carrierCompanyId: true,
  createdByUserId: true,
  message: true,
  offeredPriceAmount: true,
  currency: true,
  estimatedPickupAt: true,
  estimatedDeliveryAt: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  post: {
    select: {
      id: true,
      companyId: true,
      status: true,
      deletedAt: true,
      routeId: true,
      currency: true,
      priceType: true,
    },
  },
} as const;

export class BidsRepository {
  async listByCompanyInvolvement(filters: ListFilters) {
    return prisma.bid.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.postId ? { postId: filters.postId } : {}),
        OR: [
          { carrierCompanyId: filters.companyId },
          { post: { companyId: filters.companyId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: bidSelect,
    });
  }

  async findActiveById(bidId: string) {
    return prisma.bid.findFirst({
      where: {
        id: bidId,
        deletedAt: null,
      },
      select: bidSelect,
    });
  }

  async findAnyById(bidId: string) {
    return prisma.bid.findUnique({
      where: { id: bidId },
      select: bidSelect,
    });
  }

  async findActivePostById(postId: string) {
    return prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        status: true,
        currency: true,
      },
    });
  }

  async create(data: CreateBidData) {
    return prisma.bid.create({
      data,
      select: bidSelect,
    });
  }

  async update(bidId: string, data: UpdateBidData) {
    return prisma.bid.update({
      where: { id: bidId },
      data,
      select: bidSelect,
    });
  }

  async updateStatus(bidId: string, status: BidStatus) {
    return prisma.bid.update({
      where: { id: bidId },
      data: { status },
      select: bidSelect,
    });
  }

  async acceptBidAndClosePost(bidId: string, postId: string) {
    return prisma.$transaction(async (tx) => {
      const updatedBid = await tx.bid.update({
        where: { id: bidId },
        data: { status: BidStatus.ACCEPTED },
        select: bidSelect,
      });

      await tx.bid.updateMany({
        where: {
          postId,
          id: { not: bidId },
          deletedAt: null,
          status: BidStatus.PENDING,
        },
        data: { status: BidStatus.REJECTED },
      });

      await tx.post.update({
        where: { id: postId },
        data: { status: "ASSIGNED" },
      });

      return updatedBid;
    });
  }

  async softDelete(bidId: string) {
    return prisma.bid.update({
      where: { id: bidId },
      data: { deletedAt: new Date() },
      select: bidSelect,
    });
  }

  async restore(bidId: string) {
    return prisma.bid.update({
      where: { id: bidId },
      data: { deletedAt: null },
      select: bidSelect,
    });
  }

  async createWithMonthlyUsageReservation(input: {
    data: CreateBidData;
    periodStart: Date;
    limit: number | null;
    planCode: PlanCode;
  }) {
    return prisma.$transaction(async (tx) => {
      if (input.limit !== null) {
        const seededUsed = await tx.bid.count({
          where: {
            carrierCompanyId: input.data.carrierCompanyId,
            deletedAt: null,
            createdAt: { gte: input.periodStart },
          },
        });

        await tx.usageCounter.upsert({
          where: {
            companyId_metric_periodStart: {
              companyId: input.data.carrierCompanyId,
              metric: UsageMetric.BIDS_PER_MONTH,
              periodStart: input.periodStart,
            },
          },
          update: {},
          create: {
            companyId: input.data.carrierCompanyId,
            metric: UsageMetric.BIDS_PER_MONTH,
            periodStart: input.periodStart,
            used: seededUsed,
            limitSnapshot: input.limit,
            planCodeSnapshot: input.planCode,
          },
        });

        const reserved = await tx.usageCounter.updateMany({
          where: {
            companyId: input.data.carrierCompanyId,
            metric: UsageMetric.BIDS_PER_MONTH,
            periodStart: input.periodStart,
            used: { lt: input.limit },
          },
          data: {
            used: { increment: 1 },
            limitSnapshot: input.limit,
            planCodeSnapshot: input.planCode,
          },
        });

        if (reserved.count !== 1) {
          throw new Error("BID_MONTHLY_LIMIT_REACHED");
        }
      }

      return tx.bid.create({
        data: input.data,
        select: bidSelect,
      });
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

