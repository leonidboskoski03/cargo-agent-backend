import { beforeEach, describe, expect, it, vi } from "vitest";
import { BidStatus, PostStatus, UserRole } from "@prisma/client";
import { ContractsService } from "../../../../src/modules/contracts/contracts.service.js";
import { ContractsRepository } from "../../../../src/modules/contracts/contracts.repository.js";

describe("ContractsService.create", () => {
  const service = new ContractsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects accepted bid that does not belong to provided post", async () => {
    vi.spyOn(ContractsRepository.prototype, "findActivePostById").mockResolvedValue({
      id: "post_1",
      companyId: "shipper_1",
      routeId: "route_1",
      status: PostStatus.ASSIGNED,
    } as never);

    vi.spyOn(ContractsRepository.prototype, "findActiveBidById").mockResolvedValue({
      id: "bid_1",
      postId: "post_other",
      status: BidStatus.ACCEPTED,
      offeredPriceAmount: "1000.00",
      currency: "EUR",
      carrierCompanyId: "carrier_1",
    } as never);

    await expect(
      service.create(
        {
          userId: "admin_1",
          role: UserRole.COMPANY_ADMIN,
          companyId: "shipper_1",
        },
        {
          postId: "post_1",
          acceptedBidId: "bid_1",
          pickupPlannedAt: undefined,
          deliveryPlannedAt: undefined,
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BID_POST_MISMATCH",
    });
  });
});

