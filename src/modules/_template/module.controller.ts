import type { Request, Response } from "express";
import { ok } from "../../shared/http/apiResponse.js";

export function listModuleItems(_req: Request, res: Response) {
  return ok(res, { message: "Replace with module implementation" });
}

