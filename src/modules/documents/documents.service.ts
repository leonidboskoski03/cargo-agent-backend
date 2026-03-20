import { type DocumentKind, type Prisma, type UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { createDocumentSchema, listDocumentsSchema } from "./documents.validator.js";
import { DocumentsRepository } from "./documents.repository.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

type ListQuery = z.infer<typeof listDocumentsSchema>["query"];
type CreateBody = z.infer<typeof createDocumentSchema>["body"];

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

function requireAuth(auth: AuthContext) {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function assertAccess(auth: AuthContext, doc: { ownerUserId: string | null; ownerCompanyId: string | null }) {
  if (auth.role === Roles.JOB_SEEKER) {
    if (doc.ownerUserId !== auth.userId) {
      throw new AppError(403, "FORBIDDEN", "You can only access your own documents");
    }

    return;
  }

  if (!auth.companyId || doc.ownerCompanyId !== auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "You can only access company documents in your scope");
  }
}

export class DocumentsService {
  private readonly repository = new DocumentsRepository();

  async list(auth: AuthContext, query: ListQuery) {
    requireAuth(auth);

    if (auth.role === Roles.JOB_SEEKER) {
      return this.repository.list({
        ownerUserId: auth.userId,
        page: query.page,
        pageSize: query.pageSize,
        kind: query.kind,
      });
    }

    if ((auth.role === Roles.COMPANY_ADMIN || auth.role === Roles.COMPANY_DRIVER) && auth.companyId) {
      return this.repository.list({
        ownerCompanyId: auth.companyId,
        page: query.page,
        pageSize: query.pageSize,
        kind: query.kind,
      });
    }

    throw new AppError(403, "FORBIDDEN", "You do not have permission to list documents");
  }

  async getById(auth: AuthContext, documentId: string) {
    requireAuth(auth);

    const document = await this.repository.findById(documentId);
    if (!document || document.deletedAt) {
      throw new AppError(404, "DOCUMENT_NOT_FOUND", "Document not found");
    }

    assertAccess(auth, {
      ownerUserId: document.ownerUserId,
      ownerCompanyId: document.ownerCompanyId,
    });

    return document;
  }

  async create(auth: AuthContext, body: CreateBody) {
    requireAuth(auth);

    const createInput: CreateInput = {
      uploadedByUserId: auth.userId as string,
      kind: body.kind,
      name: body.name,
      mimeType: body.mimeType,
      url: body.url,
      metadataJson: body.metadataJson as Prisma.InputJsonValue | undefined,
    };

    if (auth.role === Roles.JOB_SEEKER) {
      createInput.ownerUserId = auth.userId;
      createInput.ownerCompanyId = undefined;
    } else if ((auth.role === Roles.COMPANY_ADMIN || auth.role === Roles.COMPANY_DRIVER) && auth.companyId) {
      createInput.ownerCompanyId = auth.companyId;
      createInput.ownerUserId = undefined;
    } else {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to create documents");
    }

    // Ignore explicit owner overrides from request to keep strict auth-based ownership.
    void body.ownerUserId;
    void body.ownerCompanyId;

    return this.repository.create(createInput);
  }

  async remove(auth: AuthContext, documentId: string) {
    requireAuth(auth);

    const document = await this.repository.findById(documentId);
    if (!document || document.deletedAt) {
      throw new AppError(404, "DOCUMENT_NOT_FOUND", "Document not found");
    }

    assertAccess(auth, {
      ownerUserId: document.ownerUserId,
      ownerCompanyId: document.ownerCompanyId,
    });

    return this.repository.softDelete(documentId);
  }

  async restore(auth: AuthContext, documentId: string) {
    requireAuth(auth);

    const document = await this.repository.findById(documentId);
    if (!document) {
      throw new AppError(404, "DOCUMENT_NOT_FOUND", "Document not found");
    }

    if (!document.deletedAt) {
      throw new AppError(400, "DOCUMENT_NOT_DELETED", "Document is already active");
    }

    assertAccess(auth, {
      ownerUserId: document.ownerUserId,
      ownerCompanyId: document.ownerCompanyId,
    });

    return this.repository.restore(documentId);
  }
}

