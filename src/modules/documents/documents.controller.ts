import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { DocumentsService } from "./documents.service.js";

const service = new DocumentsService();


export async function listDocuments(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    page: Number(req.query.page ?? 1),
    pageSize: Number(req.query.pageSize ?? 20),
    kind: req.query.kind as never,
  });

  return ok(res, data);
}

export async function getDocumentById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.documentId));
  return ok(res, data);
}

export async function createDocument(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    kind: req.body.kind,
    name: req.body.name,
    mimeType: req.body.mimeType,
    url: req.body.url,
    metadataJson: req.body.metadataJson,
    ownerUserId: req.body.ownerUserId,
    ownerCompanyId: req.body.ownerCompanyId,
  });

  return created(res, data);
}

export async function uploadDocument(req: Request, res: Response) {
  const data = await service.upload(authFromRequest(req), {
    contentBase64: req.body.contentBase64,
    fileName: req.body.fileName,
    kind: req.body.kind,
    name: req.body.name,
    mimeType: req.body.mimeType,
    metadataJson: req.body.metadataJson,
    ownerUserId: req.body.ownerUserId,
    ownerCompanyId: req.body.ownerCompanyId,
  });

  return created(res, data);
}

export async function deleteDocument(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.documentId));
  return ok(res, data);
}

export async function restoreDocument(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.documentId));
  return ok(res, data);
}

