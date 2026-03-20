import { NotificationType } from "@prisma/client";
import { NotificationsService } from "./notifications.service.js";
import { prisma } from "../../shared/prisma/prismaClient.js";
import type { NotificationEventJobPayload } from "../../shared/queue/notificationEvents.queue.js";

const notificationsService = new NotificationsService();

export class NotificationEventsService {
  async handleEvent(event: NotificationEventJobPayload) {
    if (event.type === "BID_ACCEPTED") {
      const bid = await prisma.bid.findFirst({
        where: { id: event.bidId, deletedAt: null },
        select: {
          id: true,
          carrierCompanyId: true,
          postId: true,
        },
      });

      if (!bid) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.BID_ACCEPTED,
        recipientCompanyId: bid.carrierCompanyId,
        title: "Bid accepted",
        body: "Your bid has been accepted by the shipper.",
        payloadJson: {
          bidId: bid.id,
          postId: bid.postId,
        },
      });

      return;
    }

    if (event.type === "CONTRACT_CREATED") {
      const contract = await prisma.contract.findFirst({
        where: { id: event.contractId, deletedAt: null },
        select: {
          id: true,
          shipperCompanyId: true,
          carrierCompanyId: true,
          postId: true,
        },
      });

      if (!contract) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.CONTRACT_CREATED,
        recipientCompanyId: contract.carrierCompanyId,
        title: "Contract created",
        body: "A new contract has been created from your accepted bid.",
        payloadJson: {
          contractId: contract.id,
          postId: contract.postId,
          shipperCompanyId: contract.shipperCompanyId,
        },
      });

      return;
    }

    const review = await prisma.review.findFirst({
      where: { id: event.reviewId, deletedAt: null, status: "PUBLISHED" },
      select: {
        id: true,
        contractId: true,
        targetCompanyId: true,
        reviewerCompanyId: true,
      },
    });

    if (!review) {
      return;
    }

    await notificationsService.create({
      type: NotificationType.REVIEW_PUBLISHED,
      recipientCompanyId: review.targetCompanyId,
      title: "New review published",
      body: "A review has been published about your company.",
      payloadJson: {
        reviewId: review.id,
        contractId: review.contractId,
        reviewerCompanyId: review.reviewerCompanyId,
      },
    });
  }
}

