import { type DocumentKind, type Prisma, type UserRole } from "@prisma/client";
import { z } from "zod";
import { createDocumentSchema, listDocumentsSchema, uploadDocumentSchema } from "./documents.validator.js";

export type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

export type ListQuery = z.infer<typeof listDocumentsSchema>["query"];
export type CreateBody = z.infer<typeof createDocumentSchema>["body"];
export type UploadBody = z.infer<typeof uploadDocumentSchema>["body"];

export type CreateInput = {
  ownerUserId?: string;
  ownerCompanyId?: string;
  uploadedByUserId: string;
  kind: DocumentKind;
  name: string;
  mimeType: string;
  url: string;
  metadataJson?: Prisma.InputJsonValue;
};

