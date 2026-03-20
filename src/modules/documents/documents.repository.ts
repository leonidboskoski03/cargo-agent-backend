import { DocumentKind, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type ListFilters = {
  ownerUserId?: string;
  ownerCompanyId?: string;
  kind?: DocumentKind;
  page: number;
  pageSize: number;
};

type CreateInput = {
  ownerUserId?: string;
  ownerCompanyId?: string;
  uploadedByUserId: string;
  kind: DocumentKind;
  name: string;
  mimeType: string;
  url: string;
  metadataJson?: Prisma.InputJsonValue;
};

export class DocumentsRepository {
  async list(filters: ListFilters) {
    return prisma.document.findMany({
      where: {
        deletedAt: null,
        ...(filters.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
        ...(filters.ownerCompanyId ? { ownerCompanyId: filters.ownerCompanyId } : {}),
        ...(filters.kind ? { kind: filters.kind } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });
  }

  async findById(documentId: string) {
    return prisma.document.findUnique({
      where: { id: documentId },
    });
  }

  async create(input: CreateInput) {
    return prisma.document.create({
      data: {
        ownerUserId: input.ownerUserId,
        ownerCompanyId: input.ownerCompanyId,
        uploadedByUserId: input.uploadedByUserId,
        kind: input.kind,
        name: input.name,
        mimeType: input.mimeType,
        url: input.url,
        metadataJson: input.metadataJson,
      },
    });
  }

  async softDelete(documentId: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async restore(documentId: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: {
        deletedAt: null,
      },
    });
  }
}

