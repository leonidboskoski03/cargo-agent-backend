import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { DocumentsService } from "./documents.service.js";

const service = new DocumentsService();

export async function listDocuments(req: Request, res: Response) {
  const data = await service.list(req.query);
  return ok(res, data);
}

