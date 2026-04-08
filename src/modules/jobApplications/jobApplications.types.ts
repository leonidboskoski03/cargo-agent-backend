import { z } from "zod";
import {
  applyToJobApplicationSchema,
  createJobApplicationSchema,
} from "./jobApplications.validator.js";

export type CreateJobApplicationBody = z.infer<typeof createJobApplicationSchema>["body"];
export type ApplyJobApplicationParams = z.infer<typeof applyToJobApplicationSchema>["params"];
export type ApplyJobApplicationBody = z.infer<typeof applyToJobApplicationSchema>["body"];

export type AuthContext = {
  userId?: string;
  role?: string;
  companyId?: string;
};

export type CreateJobApplicationInput = {
  auth: AuthContext;
  body: CreateJobApplicationBody;
};

export type ApplyInput = {
  auth: AuthContext;
  jobApplicationId: ApplyJobApplicationParams["jobApplicationId"];
  message?: ApplyJobApplicationBody["message"];
};

export type PromoteListingInput = {
  auth: AuthContext;
  jobApplicationId: string;
  days?: number;
};

export type PromoteSubmissionInput = {
  auth: AuthContext;
  jobApplicationId: string;
  submissionId: string;
  days?: number;
};

