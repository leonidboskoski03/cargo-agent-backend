import { beforeEach, describe, expect, it, vi } from "vitest";
import { BidStatus, ContractStatus, PostStatus, ReviewStatus, UserRole } from "@prisma/client";

vi.mock("../../../src/shared/queue/notificationEvents.queue.js", () => ({
  enqueueNotificationEvent: vi.fn(),
}));

vi.mock("../../../src/shared/audit/auditLogger.js", () => ({
  writeAuditEvent: vi.fn(),
}));

import { BidsService } from "../../../src/modules/bids/bids.service.js";
import { BidsRepository } from "../../../src/modules/bids/bids.repository.js";
import { ContractsService } from "../../../src/modules/contracts/contracts.service.js";
import { ContractsRepository } from "../../../src/modules/contracts/contracts.repository.js";
import { ReviewsService } from "../../../src/modules/reviews/reviews.service.js";
import { ReviewsRepository } from "../../../src/modules/reviews/reviews.repository.js";
import { enqueueNotificationEvent } from "../../../src/shared/queue/notificationEvents.queue.js";
import { writeAuditEvent } from "../../../src/shared/audit/auditLogger.js";

describe("Marketplace lifecycle workflow", () => {
  const bidsService = new BidsService();
  const contractsService = new ContractsService();
  const reviewsService = new ReviewsService();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("accepts bid, creates contract, and publishes review with audit + notification events", async () => {
    vi.spyOn(BidsRepository.prototype, "findActiveById").mockResolvedValue({
      id: "bid_1",
      postId: "post_1",
      status: BidStatus.PENDING,
      carrierCompanyId: "carrier_1",
      post: {
        id: "post_1",
        companyId: "shipper_1",
        status: PostStatus.OPEN,
      },
    } as never);

    vi.spyOn(BidsRepository.prototype, "acceptBidAndClosePost").mockResolvedValue({
      id: "bid_1",
      status: BidStatus.ACCEPTED,
    } as never);

    vi.spyOn(ContractsRepository.prototype, "findActivePostById").mockResolvedValue({
      id: "post_1",
      companyId: "shipper_1",
      routeId: "route_1",
      status: PostStatus.ASSIGNED,
    } as never);

    vi.spyOn(ContractsRepository.prototype, "findActiveBidById").mockResolvedValue({
      id: "bid_1",
      postId: "post_1",
      carrierCompanyId: "carrier_1",
      offeredPriceAmount: "1200.00",
      currency: "EUR",
      status: BidStatus.ACCEPTED,
    } as never);

    vi.spyOn(ContractsRepository.prototype, "create").mockResolvedValue({
      id: "contract_1",
      status: ContractStatus.CONFIRMED,
    } as never);

    vi.spyOn(ReviewsRepository.prototype, "findActiveById").mockResolvedValue({
      id: "review_1",
      status: ReviewStatus.DRAFT,
      reviewerCompanyId: "shipper_1",
      targetCompanyId: "carrier_1",
      contract: {
        id: "contract_1",
        shipperCompanyId: "shipper_1",
        carrierCompanyId: "carrier_1",
      },
    } as never);

    vi.spyOn(ReviewsRepository.prototype, "updateStatus").mockResolvedValue({
      id: "review_1",
      status: ReviewStatus.PUBLISHED,
    } as never);

    await bidsService.changeStatus(
      { userId: "admin_shipper", role: UserRole.COMPANY_ADMIN, companyId: "shipper_1" },
      "bid_1",
      { status: BidStatus.ACCEPTED },
    );

    await contractsService.create(
      { userId: "admin_shipper", role: UserRole.COMPANY_ADMIN, companyId: "shipper_1" },
      { postId: "post_1", acceptedBidId: "bid_1", pickupPlannedAt: undefined, deliveryPlannedAt: undefined },
    );

    await reviewsService.changeStatus(
      { userId: "admin_shipper", role: UserRole.COMPANY_ADMIN, companyId: "shipper_1" },
      "review_1",
      { status: ReviewStatus.PUBLISHED },
    );

    expect(writeAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "BID_ACCEPTED", entityType: "Bid" }));
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONTRACT_CREATED", entityType: "Contract" }),
    );

    expect(enqueueNotificationEvent).toHaveBeenCalledWith({ type: "BID_ACCEPTED", bidId: "bid_1" });
    expect(enqueueNotificationEvent).toHaveBeenCalledWith({ type: "CONTRACT_CREATED", contractId: "contract_1" });
    expect(enqueueNotificationEvent).toHaveBeenCalledWith({ type: "REVIEW_PUBLISHED", reviewId: "review_1" });
  });
});


