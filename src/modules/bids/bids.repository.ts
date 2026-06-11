import { BidActivityType, BidStatus, ContractStatus, PlanCode, Prisma, UsageMetric } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListFilters = {
  companyId: string;
  scope?: "received" | "sent" | "all";
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

type CreateContractFromBidData = {
  acceptedBidId: string;
  actorCompanyId: string;
  actorUserId?: string;
  agreedPriceAmount: Prisma.Decimal | string | number;
  carrierCompanyId: string;
  currency: string;
  postId: string;
  routeId: string;
  shipperCompanyId: string;
};

type CreateBidActivityData = {
  actorCompanyId?: string;
  actorUserId?: string;
  bidId: string;
  message?: string;
  metadataJson?: Prisma.InputJsonValue;
  type: BidActivityType;
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
  boostCredits: true,
  boostedUntil: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  post: {
    select: {
      id: true,
      companyId: true,
      title: true,
      cargoDescription: true,
      priceAmount: true,
      status: true,
      deletedAt: true,
      routeId: true,
      currency: true,
      priceType: true,
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
              id: true,
              city: true,
              countryCode: true,
            },
          },
          destinationLocation: {
            select: {
              id: true,
              city: true,
              countryCode: true,
            },
          },
        },
      },
    },
  },
  carrierCompany: {
    select: {
      id: true,
      name: true,
      city: true,
      countryCode: true,
      isVerified: true,
    },
  },
  contract: {
    select: {
      id: true,
      status: true,
    },
  },
} as const;

export class BidsRepository {
  async listByCompanyInvolvement(filters: ListFilters) {
    const now = new Date();
    return prisma.bid.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.postId ? { postId: filters.postId } : {}),
        ...(filters.scope === "sent"
          ? { carrierCompanyId: filters.companyId }
          : filters.scope === "received"
            ? { post: { companyId: filters.companyId } }
            : {
                OR: [
                  { carrierCompanyId: filters.companyId },
                  { post: { companyId: filters.companyId } },
                ],
              }),
      },
      orderBy:
        filters.scope === "received"
          ? [
              { boostedUntil: { sort: "desc", nulls: "last" } },
              { boostCredits: "desc" },
              { createdAt: "desc" },
            ]
          : { createdAt: "desc" },
      select: bidSelect,
    }).then((bids) =>
      filters.scope === "received"
        ? [...bids].sort((left, right) => {
            const leftActive = left.boostedUntil && left.boostedUntil > now ? 1 : 0;
            const rightActive = right.boostedUntil && right.boostedUntil > now ? 1 : 0;
            if (leftActive !== rightActive) return rightActive - leftActive;
            if (leftActive && rightActive && left.boostCredits !== right.boostCredits) return right.boostCredits - left.boostCredits;
            return right.createdAt.getTime() - left.createdAt.getTime();
          })
        : bids,
    );
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

  async listActivities(bidId: string) {
    return prisma.bidActivity.findMany({
      where: { bidId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createActivity(data: CreateBidActivityData) {
    return prisma.bidActivity.create({
      data: {
        actorCompanyId: data.actorCompanyId,
        actorUserId: data.actorUserId,
        bidId: data.bidId,
        message: data.message,
        metadataJson: data.metadataJson,
        type: data.type,
      },
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

  async acceptBidAndCreateContract(input: CreateContractFromBidData) {
    return prisma.$transaction(async (tx) => {
      await tx.bid.update({
        where: { id: input.acceptedBidId },
        data: { status: BidStatus.ACCEPTED },
      });

      await tx.bid.updateMany({
        where: {
          postId: input.postId,
          id: { not: input.acceptedBidId },
          deletedAt: null,
          status: BidStatus.PENDING,
        },
        data: { status: BidStatus.REJECTED },
      });

      await tx.post.update({
        where: { id: input.postId },
        data: { status: "ASSIGNED" },
      });

      const contract = await tx.contract.upsert({
        where: { acceptedBidId: input.acceptedBidId },
        create: {
          acceptedBidId: input.acceptedBidId,
          agreedPriceAmount: input.agreedPriceAmount,
          carrierCompanyId: input.carrierCompanyId,
          currency: input.currency,
          postId: input.postId,
          routeId: input.routeId,
          shipperCompanyId: input.shipperCompanyId,
          status: ContractStatus.CONFIRMED,
        },
        update: {},
        select: {
          id: true,
          status: true,
        },
      });

      await tx.bidActivity.create({
        data: {
          actorCompanyId: input.actorCompanyId,
          actorUserId: input.actorUserId,
          bidId: input.acceptedBidId,
          message: "Contract created",
          metadataJson: { contractId: contract.id, postId: input.postId },
          type: BidActivityType.CONTRACT_CREATED,
        },
      });

      return tx.bid.findUniqueOrThrow({
        where: { id: input.acceptedBidId },
        select: bidSelect,
      });
    });
  }

  async boostBid(bidId: string, input: { boostCredits: number; boostedUntil: Date }) {
    return prisma.bid.update({
      where: { id: bidId },
      data: {
        boostCredits: { increment: input.boostCredits },
        boostedUntil: input.boostedUntil,
      },
      select: bidSelect,
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

