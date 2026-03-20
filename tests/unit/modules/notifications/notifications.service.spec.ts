import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { NotificationsService } from "../../../../src/modules/notifications/notifications.service.js";
import { NotificationsRepository } from "../../../../src/modules/notifications/notifications.repository.js";

describe("NotificationsService.markRead", () => {
  const service = new NotificationsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects company user attempting to mark another company's notification", async () => {
    vi.spyOn(NotificationsRepository.prototype, "findById").mockResolvedValue({
      id: "n1",
      recipientCompanyId: "company_other",
      recipientUserId: null,
      readAt: null,
    } as never);

    await expect(
      service.markRead(
        {
          userId: "admin_1",
          role: UserRole.COMPANY_ADMIN,
          companyId: "company_me",
        },
        "n1",
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });
});

