import { Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListFilters = {
  companyId: string;
  status?: ReviewStatus;
  contractId?: string;
};

type CreateReviewData = {
  contractId: string;
  reviewerCompanyId: string;
  reviewerUserId: string;
  targetCompanyId: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
};

type UpdateReviewData = {
  rating?: number;
  comment?: string | null;
};

const reviewSelect = {
  id: true,
  contractId: true,
  reviewerCompanyId: true,
  reviewerUserId: true,
  targetCompanyId: true,
  rating: true,
  comment: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  contract: {
    select: {
      id: true,
      shipperCompanyId: true,
      carrierCompanyId: true,
      status: true,
      deletedAt: true,
    },
  },
} as const;

export class ReviewsRepository {
  async listByCompanyInvolvement(filters: ListFilters) {
    return prisma.review.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.contractId ? { contractId: filters.contractId } : {}),
        OR: [{ reviewerCompanyId: filters.companyId }, { targetCompanyId: filters.companyId }],
      },
      orderBy: { createdAt: "desc" },
      select: reviewSelect,
    });
  }

  async findActiveById(reviewId: string) {
    return prisma.review.findFirst({
      where: {
        id: reviewId,
        deletedAt: null,
      },
      select: reviewSelect,
    });
  }

  async findAnyById(reviewId: string) {
    return prisma.review.findUnique({
      where: { id: reviewId },
      select: reviewSelect,
    });
  }

  async findActiveContractById(contractId: string) {
    return prisma.contract.findFirst({
      where: {
        id: contractId,
        deletedAt: null,
      },
      select: {
        id: true,
        shipperCompanyId: true,
        carrierCompanyId: true,
        status: true,
      },
    });
  }

  async create(data: CreateReviewData) {
    return prisma.review.create({
      data,
      select: reviewSelect,
    });
  }

  async update(reviewId: string, data: UpdateReviewData) {
    return prisma.review.update({
      where: { id: reviewId },
      data,
      select: reviewSelect,
    });
  }

  async updateStatus(reviewId: string, status: ReviewStatus) {
    return prisma.review.update({
      where: { id: reviewId },
      data: { status },
      select: reviewSelect,
    });
  }

  async softDelete(reviewId: string) {
    return prisma.review.update({
      where: { id: reviewId },
      data: { deletedAt: new Date() },
      select: reviewSelect,
    });
  }

  async restore(reviewId: string) {
    return prisma.review.update({
      where: { id: reviewId },
      data: { deletedAt: null },
      select: reviewSelect,
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

