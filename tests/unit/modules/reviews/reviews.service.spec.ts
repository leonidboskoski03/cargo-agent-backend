import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContractStatus, ReviewStatus, UserRole } from "@prisma/client";
import { ReviewsService } from "../../../../src/modules/reviews/reviews.service.js";
import { ReviewsRepository } from "../../../../src/modules/reviews/reviews.repository.js";

describe("ReviewsService.getById", () => {
  const service = new ReviewsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("hides draft reviews from non-reviewer company", async () => {
    vi.spyOn(ReviewsRepository.prototype, "findActiveById").mockResolvedValue({
      id: "review_1",
      status: ReviewStatus.DRAFT,
      reviewerCompanyId: "company_reviewer",
      targetCompanyId: "company_target",
      contract: {
        id: "contract_1",
        shipperCompanyId: "company_reviewer",
        carrierCompanyId: "company_target",
        status: ContractStatus.COMPLETED,
      },
    } as never);

    await expect(
      service.getById(
        {
          userId: "driver_1",
          role: UserRole.COMPANY_DRIVER,
          companyId: "company_target",
        },
        "review_1",
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });
});

