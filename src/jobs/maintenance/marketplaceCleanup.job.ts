import { BidStatus, PostStatus } from "@prisma/client";
import { logger } from "../../config/logger.js";
import { prisma } from "../../shared/prisma/prismaClient.js";

export async function cleanupMarketplaceStateJob(now = new Date()) {
  const expiredPosts = await prisma.post.updateMany({
    where: {
      deletedAt: null,
      status: PostStatus.OPEN,
      expiresAt: { lte: now },
    },
    data: { status: PostStatus.EXPIRED },
  });

  const closedBids = await prisma.bid.updateMany({
    where: {
      deletedAt: null,
      status: BidStatus.PENDING,
      post: {
        deletedAt: null,
        status: { in: [PostStatus.CANCELLED, PostStatus.EXPIRED] },
      },
    },
    data: { status: BidStatus.REJECTED },
  });

  const result = {
    expiredPosts: expiredPosts.count,
    closedBids: closedBids.count,
  };

  logger.info(result, "Marketplace cleanup job completed");
  return result;
}
