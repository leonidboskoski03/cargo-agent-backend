import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentKind, UserRole } from "@prisma/client";
import { DocumentsService } from "../../../../src/modules/documents/documents.service.js";
import { DocumentsRepository } from "../../../../src/modules/documents/documents.repository.js";

describe("DocumentsService.create", () => {
  const service = new DocumentsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores owner overrides for job seeker and uses authenticated ownership", async () => {
    const createSpy = vi.spyOn(DocumentsRepository.prototype, "create").mockResolvedValue({ id: "doc_1" } as never);

    await service.create(
      {
        userId: "user_1",
        role: UserRole.JOB_SEEKER,
      },
      {
        kind: DocumentKind.OTHER,
        name: "My CV",
        mimeType: "application/pdf",
        url: "https://example.com/cv.pdf",
        metadataJson: { source: "upload" },
        ownerUserId: "another_user",
        ownerCompanyId: "company_x",
      },
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: "user_1",
        ownerCompanyId: undefined,
        uploadedByUserId: "user_1",
      }),
    );
  });
});

