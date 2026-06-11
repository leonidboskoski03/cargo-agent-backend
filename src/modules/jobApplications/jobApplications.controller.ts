import type { Request, Response } from "express";
import { created, ok } from "../../shared/http/apiResponse.js";
import { authFromRequest, getStringParam } from "../../shared/http/controllerAuth.helpers.js";
import { JobApplicationsService } from "./jobApplications.service.js";

const service = new JobApplicationsService();

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

export async function updateJobApplication(req: Request, res: Response) {
  const data = await service.update({
    auth: authFromRequest(req),
    body: req.body,
    jobApplicationId: getStringParam(req.params.jobApplicationId),
  });

  return ok(res, data);
}

export async function deleteJobApplication(req: Request, res: Response) {
  const data = await service.remove(authFromRequest(req), getStringParam(req.params.jobApplicationId));
  return ok(res, data);
}

export async function restoreJobApplication(req: Request, res: Response) {
  const data = await service.restore(authFromRequest(req), getStringParam(req.params.jobApplicationId));
  return ok(res, data);
}

export async function applyToJobApplication(req: Request, res: Response) {
  const data = await service.apply({
    auth: authFromRequest(req),
    jobApplicationId: getStringParam(req.params.jobApplicationId),
    message: req.body.message,
  });

  return created(res, data);
}

export async function listSubmissionsForMyListing(req: Request, res: Response) {
  const data = await service.listSubmissionsForMyListing(authFromRequest(req), getStringParam(req.params.jobApplicationId));
  return ok(res, data);
}

export async function promoteJobApplication(req: Request, res: Response) {
  const data = await service.promoteJobApplication({
    auth: authFromRequest(req),
    jobApplicationId: getStringParam(req.params.jobApplicationId),
    days: req.body.days,
  });

  return ok(res, data);
}

export async function promoteJobApplicationSubmission(req: Request, res: Response) {
  const data = await service.promoteSubmission({
    auth: authFromRequest(req),
    jobApplicationId: getStringParam(req.params.jobApplicationId),
    submissionId: getStringParam(req.params.submissionId),
    days: req.body.days,
  });

  return ok(res, data);
}

