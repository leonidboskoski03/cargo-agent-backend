import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { ContractsService } from "./contracts.service.js";

const service = new ContractsService();

function authFromRequest(req: Request) {
  return req.auth ? { userId: req.auth.sub, role: req.auth.role, companyId: req.auth.companyId } : {};
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function listContracts(req: Request, res: Response) {
  const data = await service.list(authFromRequest(req), {
    status: req.query.status as never,
  });

  return ok(res, data);
}

export async function getContractById(req: Request, res: Response) {
  const data = await service.getById(authFromRequest(req), getStringParam(req.params.contractId));
  return ok(res, data);
}

export async function createContract(req: Request, res: Response) {
  const data = await service.create(authFromRequest(req), {
    postId: req.body.postId,
    acceptedBidId: req.body.acceptedBidId,
    pickupPlannedAt: req.body.pickupPlannedAt,
    deliveryPlannedAt: req.body.deliveryPlannedAt,
  });

  return created(res, data);
}

export async function changeContractStatus(req: Request, res: Response) {
  const data = await service.changeStatus(authFromRequest(req), getStringParam(req.params.contractId), {
    status: req.body.status,
  });

  return ok(res, data);
}

export async function deleteContract(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.contractId));
  return ok(res, data);
}

export async function restoreContract(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.contractId));
  return ok(res, data);
}

