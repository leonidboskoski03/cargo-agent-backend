import { type Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { assertAccess, requireAuth } from "./documents.helpers.js";
import { DocumentsRepository } from "./documents.repository.js";
import type { AuthContext, CreateBody, CreateInput, ListQuery, UploadBody } from "./documents.service.types.js";

function extensionFromMimeType(mimeType: string) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  return map[mimeType] ?? "";
}

function decodeBase64Upload(input: { contentBase64: string; mimeType: string }) {
  const dataUrlMatch = input.contentBase64.match(/^data:([^;]+);base64,(.+)$/);
  const declaredMimeType = dataUrlMatch?.[1];
  const base64Payload = dataUrlMatch?.[2] ?? input.contentBase64;
  const mimeType = declaredMimeType ?? input.mimeType;

  if (mimeType !== input.mimeType) {
    throw new AppError(400, "UPLOAD_MIME_MISMATCH", "Uploaded file MIME type does not match the request");
  }

  return Buffer.from(base64Payload, "base64");
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
    } else if (auth.role === Roles.COMPANY_ADMIN && auth.companyId) {
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

  async upload(auth: AuthContext, body: UploadBody) {
    requireAuth(auth);

    if (env.STORAGE_PROVIDER === "s3") {
      const missing = [
        !env.S3_ENDPOINT ? "S3_ENDPOINT" : null,
        !env.S3_BUCKET ? "S3_BUCKET" : null,
        !env.S3_ACCESS_KEY_ID ? "S3_ACCESS_KEY_ID" : null,
        !env.S3_SECRET_ACCESS_KEY ? "S3_SECRET_ACCESS_KEY" : null,
      ].filter((item): item is string => Boolean(item));

      if (missing.length > 0) {
        throw new AppError(503, "STORAGE_PROVIDER_NOT_CONFIGURED", `S3 storage is missing: ${missing.join(", ")}`);
      }

      throw new AppError(501, "STORAGE_UPLOAD_NOT_IMPLEMENTED", "S3 upload transport is not implemented in this build");
    }

    if (!env.UPLOAD_ALLOWED_MIME_TYPES.includes(body.mimeType)) {
      throw new AppError(400, "UPLOAD_MIME_NOT_ALLOWED", "Uploaded file type is not allowed");
    }

    const buffer = decodeBase64Upload({ contentBase64: body.contentBase64, mimeType: body.mimeType });
    if (buffer.byteLength > env.UPLOAD_MAX_BYTES) {
      throw new AppError(413, "UPLOAD_TOO_LARGE", "Uploaded file exceeds the configured size limit");
    }

    const extension = extensionFromMimeType(body.mimeType);
    const fileName = `${randomUUID()}${extension}`;
    const uploadDir = path.resolve(env.LOCAL_UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    return this.create(auth, {
      kind: body.kind,
      metadataJson: body.metadataJson,
      mimeType: body.mimeType,
      name: body.name,
      ownerCompanyId: body.ownerCompanyId,
      ownerUserId: body.ownerUserId,
      url: `${env.UPLOAD_PUBLIC_BASE_URL.replace(/\/$/, "")}/${fileName}`,
    });
  }

  async remove(auth: AuthContext, documentId: string) {
    requireAuth(auth);

    if (auth.role === Roles.COMPANY_DRIVER) {
      throw new AppError(403, "FORBIDDEN", "Company drivers cannot delete documents");
    }

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

    if (auth.role === Roles.COMPANY_DRIVER) {
      throw new AppError(403, "FORBIDDEN", "Company drivers cannot restore documents");
    }

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

