import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostStatus, UserRole } from "@prisma/client";
import { PostsService } from "../../../../src/modules/posts/posts.service.js";
import { PostsRepository } from "../../../../src/modules/posts/posts.repository.js";

describe("PostsService.changeStatus", () => {
  const service = new PostsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid transition from ASSIGNED to CANCELLED", async () => {
    vi.spyOn(PostsRepository.prototype, "findActiveById").mockResolvedValue({
      id: "post_1",
      companyId: "company_1",
      status: PostStatus.ASSIGNED,
    } as never);

    await expect(
      service.changeStatus(
        {
          userId: "admin_1",
          role: UserRole.COMPANY_ADMIN,
          companyId: "company_1",
        },
        "post_1",
        { status: PostStatus.CANCELLED },
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "INVALID_POST_STATUS_TRANSITION",
    });
  });
});

