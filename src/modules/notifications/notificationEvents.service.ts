import { NotificationType } from "@prisma/client";
import { NotificationsService } from "./notifications.service.js";
import { prisma } from "../../shared/prisma/prismaClient.js";
import type { NotificationEventJobPayload } from "../../shared/queue/notificationEvents.queue.js";

const notificationsService = new NotificationsService();

export class NotificationEventsService {
  async handleEvent(event: NotificationEventJobPayload) {
    if (event.type === "BID_SUBMITTED") {
      const bid = await prisma.bid.findFirst({
        where: { id: event.bidId, deletedAt: null },
        select: {
          id: true,
          carrierCompanyId: true,
          postId: true,
          post: { select: { companyId: true, title: true } },
          carrierCompany: { select: { name: true } },
        },
      });

      if (!bid) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.BID_SUBMITTED,
        recipientCompanyId: bid.post.companyId,
        title: "New bid received",
        body: `${bid.carrierCompany.name} sent a bid${bid.post.title ? ` for ${bid.post.title}` : " for your open post"}.`,
        payloadJson: {
          bidId: bid.id,
          postId: bid.postId,
          carrierCompanyId: bid.carrierCompanyId,
        },
      });

      return;
    }

    if (event.type === "BID_ACCEPTED") {
      const bid = await prisma.bid.findFirst({
        where: { id: event.bidId, deletedAt: null },
        select: {
          id: true,
          carrierCompanyId: true,
          postId: true,
          contract: { select: { id: true } },
          post: { select: { title: true } },
        },
      });

      if (!bid) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.BID_ACCEPTED,
        recipientCompanyId: bid.carrierCompanyId,
        title: "Bid accepted",
        body: bid.post.title ? `Your bid for ${bid.post.title} has been accepted.` : "Your bid has been accepted by the shipper.",
        payloadJson: {
          bidId: bid.id,
          contractId: bid.contract?.id,
          postId: bid.postId,
        },
      });

      return;
    }

    if (event.type === "BID_REJECTED") {
      const bid = await prisma.bid.findFirst({
        where: { id: event.bidId, deletedAt: null },
        select: {
          id: true,
          carrierCompanyId: true,
          postId: true,
          post: { select: { title: true } },
        },
      });

      if (!bid) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.BID_REJECTED,
        recipientCompanyId: bid.carrierCompanyId,
        title: "Bid rejected",
        body: bid.post.title ? `Your bid for ${bid.post.title} was rejected.` : "Your bid was rejected by the shipper.",
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
          post: { select: { title: true } },
          shipperCompany: { select: { name: true } },
        },
      });

      if (!contract) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.CONTRACT_CREATED,
        recipientCompanyId: contract.carrierCompanyId,
        title: "Contract created",
        body: `${contract.shipperCompany.name} created a contract${contract.post.title ? ` for ${contract.post.title}` : " from your accepted bid"}.`,
        payloadJson: {
          contractId: contract.id,
          postId: contract.postId,
          shipperCompanyId: contract.shipperCompanyId,
        },
      });

      return;
    }

    if (event.type === "CONTRACT_STATUS_CHANGED") {
      const contract = await prisma.contract.findFirst({
        where: { id: event.contractId, deletedAt: null },
        select: {
          id: true,
          shipperCompanyId: true,
          carrierCompanyId: true,
          postId: true,
          post: { select: { title: true } },
        },
      });

      if (!contract) {
        return;
      }

      const recipientCompanyId =
        event.actorCompanyId === contract.shipperCompanyId ? contract.carrierCompanyId : contract.shipperCompanyId;

      await notificationsService.create({
        type: NotificationType.CONTRACT_STATUS_CHANGED,
        recipientCompanyId,
        title: "Contract status updated",
        body: `${contract.post.title ?? "A contract"} is now ${event.status.replaceAll("_", " ").toLowerCase()}.`,
        payloadJson: {
          contractId: contract.id,
          postId: contract.postId,
          status: event.status,
          actorCompanyId: event.actorCompanyId,
        },
      });

      return;
    }

    if (event.type === "VEHICLE_MARKETPLACE_INQUIRY_CREATED") {
      const inquiry = await prisma.vehicleMarketplaceInquiry.findUnique({
        where: { id: event.inquiryId },
        select: {
          id: true,
          senderCompanyId: true,
          senderUserId: true,
          listingId: true,
          listing: {
            select: {
              title: true,
              ownerCompanyId: true,
              ownerUserId: true,
            },
          },
        },
      });

      if (!inquiry) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.VEHICLE_MARKETPLACE_INQUIRY_CREATED,
        recipientCompanyId: inquiry.listing.ownerCompanyId ?? undefined,
        recipientUserId: inquiry.listing.ownerCompanyId ? undefined : inquiry.listing.ownerUserId ?? undefined,
        title: "Vehicle inquiry received",
        body: `A buyer sent an inquiry for ${inquiry.listing.title}.`,
        payloadJson: {
          inquiryId: inquiry.id,
          listingId: inquiry.listingId,
          senderCompanyId: inquiry.senderCompanyId,
          senderUserId: inquiry.senderUserId,
        },
      });

      return;
    }

    if (event.type === "VEHICLE_MARKETPLACE_INQUIRY_RESPONDED") {
      const inquiry = await prisma.vehicleMarketplaceInquiry.findUnique({
        where: { id: event.inquiryId },
        select: {
          id: true,
          senderCompanyId: true,
          senderUserId: true,
          listingId: true,
          listing: { select: { title: true } },
        },
      });

      if (!inquiry) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.VEHICLE_MARKETPLACE_INQUIRY_RESPONDED,
        recipientCompanyId: inquiry.senderCompanyId ?? undefined,
        recipientUserId: inquiry.senderCompanyId ? undefined : inquiry.senderUserId,
        title: "Vehicle inquiry responded",
        body: `The seller responded to your inquiry for ${inquiry.listing.title}.`,
        payloadJson: {
          inquiryId: inquiry.id,
          listingId: inquiry.listingId,
        },
      });

      return;
    }

    if (event.type === "JOB_APPLICATION_SUBMITTED") {
      const submission = await prisma.jobApplicationSubmission.findUnique({
        where: { id: event.submissionId },
        select: {
          id: true,
          jobApplicationId: true,
          submittedByCompanyId: true,
          submittedByUserId: true,
          jobApplication: {
            select: {
              title: true,
              createdByCompanyId: true,
              createdByUserId: true,
            },
          },
        },
      });

      if (!submission) {
        return;
      }

      await notificationsService.create({
        type: NotificationType.JOB_APPLICATION_SUBMITTED,
        recipientCompanyId: submission.jobApplication.createdByCompanyId ?? undefined,
        recipientUserId: submission.jobApplication.createdByCompanyId ? undefined : submission.jobApplication.createdByUserId,
        title: "New job response",
        body: `A new response was sent for ${submission.jobApplication.title}.`,
        payloadJson: {
          submissionId: submission.id,
          jobApplicationId: submission.jobApplicationId,
          submittedByCompanyId: submission.submittedByCompanyId,
          submittedByUserId: submission.submittedByUserId,
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

