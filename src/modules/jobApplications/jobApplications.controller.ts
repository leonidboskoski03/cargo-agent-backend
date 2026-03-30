import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { JobApplicationsService } from "./jobApplications.service.js";

const service = new JobApplicationsService();

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? "");
}

function authFromRequest(req: Request) {
  return {
    userId: req.auth?.sub,
    role: req.auth?.role,
    companyId: req.auth?.companyId,
  };
}

export async function createJobApplication(req: Request, res: Response) {
  const data = await service.create({
    auth: authFromRequest(req),
    body: req.body,
  });

  return created(res, data);
}

export async function listJobApplicationFeed(req: Request, res: Response) {
  const data = await service.listFeed(authFromRequest(req));
  return ok(res, data);
}

export async function listMyJobApplications(req: Request, res: Response) {
  const data = await service.listMine(authFromRequest(req));
  return ok(res, data);
}

export async function applyToJobApplication(req: Request, res: Response) {
  const data = await service.apply({
    auth: authFromRequest(req),
    jobApplicationId: getParam(req.params.jobApplicationId),
    message: req.body.message,
  });

  return created(res, data);
}

export async function listSubmissionsForMyListing(req: Request, res: Response) {
  const data = await service.listSubmissionsForMyListing(authFromRequest(req), getParam(req.params.jobApplicationId));
  return ok(res, data);
}

export async function promoteJobApplication(req: Request, res: Response) {
  const data = await service.promoteJobApplication({
    auth: authFromRequest(req),
    jobApplicationId: getParam(req.params.jobApplicationId),
    days: req.body.days,
  });

  return ok(res, data);
}

export async function promoteJobApplicationSubmission(req: Request, res: Response) {
  const data = await service.promoteSubmission({
    auth: authFromRequest(req),
    jobApplicationId: getParam(req.params.jobApplicationId),
    submissionId: getParam(req.params.submissionId),
    days: req.body.days,
  });

  return ok(res, data);
}

