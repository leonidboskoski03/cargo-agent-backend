import { beforeEach, describe, expect, it, vi } from "vitest";
import { BidStatus, PostStatus, UserRole } from "@prisma/client";
import { BidsService } from "../../../../src/modules/bids/bids.service.js";
import { BidsRepository } from "../../../../src/modules/bids/bids.repository.js";

describe("BidsService.changeStatus", () => {
  const service = new BidsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("forbids withdrawing a bid from another carrier company", async () => {
    vi.spyOn(BidsRepository.prototype, "findActiveById").mockResolvedValue({
      id: "bid_1",
      status: BidStatus.PENDING,
      carrierCompanyId: "carrier_other",
      postId: "post_1",
      post: {
        id: "post_1",
        companyId: "shipper_1",
        status: PostStatus.OPEN,
      },
    } as never);

    await expect(
      service.changeStatus(
        {
          userId: "admin_1",
          role: UserRole.COMPANY_ADMIN,
          companyId: "carrier_mine",
        },
        "bid_1",
        { status: BidStatus.WITHDRAWN },
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });
});

