import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";
import { LocalizationService } from "./localization.service.js";

const service = new LocalizationService();

export async function listLanguages(_req: Request, res: Response) {
  return ok(res, service.listLanguages());
}
