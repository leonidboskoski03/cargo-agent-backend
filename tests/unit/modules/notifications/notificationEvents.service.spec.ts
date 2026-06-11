import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";
import { NotificationEventsService } from "../../../../src/modules/notifications/notificationEvents.service.js";
import { NotificationsService } from "../../../../src/modules/notifications/notifications.service.js";
import { prisma } from "../../../../src/shared/prisma/prismaClient.js";

describe("NotificationEventsService.handleEvent", () => {
  const service = new NotificationEventsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates target-company notification for published review event", async () => {
    vi.spyOn(prisma.review, "findFirst").mockResolvedValue({
      id: "review_1",
      contractId: "contract_1",
      targetCompanyId: "company_target",
      reviewerCompanyId: "company_reviewer",
    } as never);

    const createSpy = vi.spyOn(NotificationsService.prototype, "create").mockResolvedValue({ id: "notif_1" } as never);

    await service.handleEvent({ type: "REVIEW_PUBLISHED", reviewId: "review_1" });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.REVIEW_PUBLISHED,
        recipientCompanyId: "company_target",
      }),
    );
  });

  it("no-ops when bid for accepted event cannot be found", async () => {
    vi.spyOn(prisma.bid, "findFirst").mockResolvedValue(null);
    const createSpy = vi.spyOn(NotificationsService.prototype, "create").mockResolvedValue({ id: "notif_1" } as never);

    await service.handleEvent({ type: "BID_ACCEPTED", bidId: "missing_bid" });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("includes linked contract id when notifying a carrier about an accepted bid", async () => {
    vi.spyOn(prisma.bid, "findFirst").mockResolvedValue({
      carrierCompanyId: "company_carrier",
      contract: { id: "contract_1" },
      id: "bid_1",
      post: { title: "Skopje to Sofia" },
      postId: "post_1",
    } as never);
    const createSpy = vi.spyOn(NotificationsService.prototype, "create").mockResolvedValue({ id: "notif_1" } as never);

    await service.handleEvent({ type: "BID_ACCEPTED", bidId: "bid_1" });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadJson: expect.objectContaining({
          bidId: "bid_1",
          contractId: "contract_1",
          postId: "post_1",
        }),
        recipientCompanyId: "company_carrier",
        type: NotificationType.BID_ACCEPTED,
      }),
    );
  });
});

