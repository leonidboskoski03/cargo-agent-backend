import { z } from "zod";
import { DocumentKind } from "@prisma/client";

const cuidParam = z.string().cuid();

export const listDocumentsSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    kind: z.nativeEnum(DocumentKind).optional(),
  }),
});

export const getDocumentByIdSchema = z.object({
  params: z.object({
    documentId: cuidParam,
  }),
  body: z.object({}),
  query: z.object({}),
});

export const createDocumentSchema = z.object({
  params: z.object({}),
  body: z.object({
    kind: z.nativeEnum(DocumentKind),
    name: z.string().trim().min(1).max(200),
    mimeType: z.string().trim().min(3).max(120),
    url: z.string().trim().url(),
    metadataJson: z.unknown().optional(),
    ownerUserId: z.string().cuid().optional(),
    ownerCompanyId: z.string().cuid().optional(),
  }),
  query: z.object({}),
});

export const uploadDocumentSchema = z.object({
  params: z.object({}),
  body: z.object({
    contentBase64: z.string().trim().min(1),
    fileName: z.string().trim().min(1).max(240),
    kind: z.nativeEnum(DocumentKind),
    name: z.string().trim().min(1).max(200),
    mimeType: z.string().trim().min(3).max(120),
    metadataJson: z.unknown().optional(),
    ownerUserId: z.string().cuid().optional(),
    ownerCompanyId: z.string().cuid().optional(),
  }),
  query: z.object({}),
});

export const deleteDocumentSchema = z.object({
  params: z.object({
    documentId: cuidParam,
  }),
  body: z.object({}),
  query: z.object({}),
});

export const restoreDocumentSchema = z.object({
  params: z.object({
    documentId: cuidParam,
  }),
  body: z.object({}),
  query: z.object({}),
});

