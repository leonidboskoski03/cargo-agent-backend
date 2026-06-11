import type { Request, Response } from "express";
import { getDeliveryStatus } from "../../shared/delivery/emailDelivery.js";
import { ok } from "../../shared/http/apiResponse.js";
import { getStorageStatus } from "../../shared/storage/storageService.js";

export async function getDeliveryProviderStatus(_req: Request, res: Response) {
  return ok(res, {
    ...getDeliveryStatus(),
    storage: getStorageStatus(),
  });
}
