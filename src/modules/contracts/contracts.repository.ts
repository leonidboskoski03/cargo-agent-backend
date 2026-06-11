import { BidActivityType, ContractStatus, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListFilters = {
  companyId: string;
  status?: ContractStatus;
};

type CreateContractData = {
  postId: string;
  acceptedBidId: string;
  routeId: string;
  shipperCompanyId: string;
  carrierCompanyId: string;
  agreedPriceAmount: Prisma.Decimal | string | number;
  currency: string;
  pickupPlannedAt?: Date;
  deliveryPlannedAt?: Date;
};

type UpdateTimelineData = {
  deliveryActualAt?: Date | null;
  deliveryPlannedAt?: Date | null;
  pickupActualAt?: Date | null;
  pickupPlannedAt?: Date | null;
};

const contractSelect = {
  id: true,
  postId: true,
  acceptedBidId: true,
  routeId: true,
  shipperCompanyId: true,
  carrierCompanyId: true,
  agreedPriceAmount: true,
  currency: true,
  status: true,
  pickupPlannedAt: true,
  deliveryPlannedAt: true,
  pickupActualAt: true,
  deliveryActualAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  post: {
    select: {
      id: true,
      title: true,
      cargoDescription: true,
      status: true,
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
  shipperCompany: {
    select: {
      id: true,
      name: true,
      city: true,
      countryCode: true,
    },
  },
  carrierCompany: {
    select: {
      id: true,
      name: true,
      city: true,
      countryCode: true,
    },
  },
} as const;

export class ContractsRepository {
  async listByCompanyInvolvement(filters: ListFilters) {
    return prisma.contract.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        OR: [{ shipperCompanyId: filters.companyId }, { carrierCompanyId: filters.companyId }],
      },
      orderBy: { createdAt: "desc" },
      select: contractSelect,
    });
  }

  async findActiveById(contractId: string) {
    return prisma.contract.findFirst({
      where: {
        id: contractId,
        deletedAt: null,
      },
      select: contractSelect,
    });
  }

  async findAnyById(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: contractSelect,
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
        routeId: true,
        status: true,
      },
    });
  }

  async findActiveBidById(bidId: string) {
    return prisma.bid.findFirst({
      where: {
        id: bidId,
        deletedAt: null,
      },
      select: {
        id: true,
        postId: true,
        carrierCompanyId: true,
        offeredPriceAmount: true,
        currency: true,
        status: true,
      },
    });
  }

  async create(data: CreateContractData) {
    return prisma.contract.create({
      data,
      select: contractSelect,
    });
  }

  async updateStatus(contractId: string, status: ContractStatus) {
    return prisma.contract.update({
      where: { id: contractId },
      data: { status },
      select: contractSelect,
    });
  }

  async updateTimeline(contractId: string, data: UpdateTimelineData) {
    return prisma.contract.update({
      where: { id: contractId },
      data,
      select: contractSelect,
    });
  }

  async createBidActivity(input: {
    actorCompanyId?: string;
    actorUserId?: string;
    bidId: string;
    contractId: string;
    postId: string;
  }) {
    return prisma.bidActivity.create({
      data: {
        actorCompanyId: input.actorCompanyId,
        actorUserId: input.actorUserId,
        bidId: input.bidId,
        message: "Contract created",
        metadataJson: { contractId: input.contractId, postId: input.postId },
        type: BidActivityType.CONTRACT_CREATED,
      },
    });
  }

  async softDelete(contractId: string) {
    return prisma.contract.update({
      where: { id: contractId },
      data: { deletedAt: new Date() },
      select: contractSelect,
    });
  }

  async restore(contractId: string) {
    return prisma.contract.update({
      where: { id: contractId },
      data: { deletedAt: null },
      select: contractSelect,
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

