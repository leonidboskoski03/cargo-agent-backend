import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { jobSeekerBillingConfig } from "../../config/jobSeekerBilling.js";
import { COMPANY_ROLES, Roles, isCompanyRole } from "../../shared/auth/permissions.js";
import {
  createJobApplicationSchema,
  applyToJobApplicationSchema,
} from "./jobApplications.validator.js";
import { JobApplicationsRepository } from "./jobApplications.repository.js";

// Infer types from Zod schemas - single source of truth
type CreateJobApplicationBody = z.infer<typeof createJobApplicationSchema>["body"];
type ApplyJobApplicationParams = z.infer<typeof applyToJobApplicationSchema>["params"];
type ApplyJobApplicationBody = z.infer<typeof applyToJobApplicationSchema>["body"];

type AuthContext = {
  userId?: string;
  role?: string;
  companyId?: string;
};

type CreateJobApplicationInput = {
  auth: AuthContext;
  body: CreateJobApplicationBody;
};

type ApplyInput = {
  auth: AuthContext;
  jobApplicationId: ApplyJobApplicationParams["jobApplicationId"];
  message?: ApplyJobApplicationBody["message"];
};

const repo = new JobApplicationsRepository();

function requireAuth(auth: AuthContext) {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export class JobApplicationsService {
  async create(input: CreateJobApplicationInput) {
    requireAuth(input.auth);

    const createdByCompanyId = isCompanyRole(input.auth.role as string) ? (input.auth.companyId ?? undefined) : undefined;

    if (isCompanyRole(input.auth.role as string) && !createdByCompanyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
    }

    if (![Roles.JOB_SEEKER, ...COMPANY_ROLES].includes(input.auth.role as never)) {
      throw new AppError(403, "FORBIDDEN", "Role is not allowed to create job applications");
    }

    return repo.create({
      createdByUserId: input.auth.userId as string,
      createdByCompanyId,
      title: input.body.title,
      description: input.body.description,
      preferredCountryCode: input.body.preferredCountryCode,
      preferredCity: input.body.preferredCity,
      expectedPayAmount: input.body.expectedPayAmount,
      currency: input.body.currency,
    });
  }

  async listFeed(auth: AuthContext) {
    requireAuth(auth);

    if (auth.role === Roles.JOB_SEEKER) {
      return repo.listOpenForJobSeeker();
    }

    if (isCompanyRole(auth.role as string)) {
      return repo.listOpenForCompany();
    }

    throw new AppError(403, "FORBIDDEN", "Role is not allowed to browse job applications");
  }

  async listMine(auth: AuthContext) {
    requireAuth(auth);
    return repo.listCreatedByUser(auth.userId as string);
  }

  async apply(input: ApplyInput) {
    requireAuth(input.auth);

    const listing = await repo.getById(input.jobApplicationId);
    if (!listing) {
      throw new AppError(404, "JOB_APPLICATION_NOT_FOUND", "Job application not found");
    }

    if (listing.createdByUserId === input.auth.userId) {
      throw new AppError(400, "CANNOT_APPLY_TO_OWN_LISTING", "You cannot apply to your own job application");
    }

    const applicantRole = input.auth.role as string;
    const applicantCompanyId = input.auth.companyId ?? undefined;
    const listingCreatedByCompany = Boolean(listing.createdByCompanyId);

    if (applicantRole === Roles.JOB_SEEKER) {
      if (!listingCreatedByCompany) {
        throw new AppError(403, "INVALID_APPLICATION_TARGET", "Job seekers can only apply to company job applications");
      }
    } else if (isCompanyRole(applicantRole)) {
      if (!applicantCompanyId) {
        throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
      }

      if (listingCreatedByCompany) {
        throw new AppError(403, "INVALID_APPLICATION_TARGET", "Companies can only apply to job seeker applications");
      }
    } else {
      throw new AppError(403, "FORBIDDEN", "Role is not allowed to apply");
    }

    try {
      if (applicantRole === Roles.JOB_SEEKER) {
        const result = await repo.createJobSeekerSubmissionWithMonetization({
          jobApplicationId: input.jobApplicationId,
          submittedByUserId: input.auth.userId as string,
          message: input.message,
          freeMonthlyLimit: jobSeekerBillingConfig.freeApplicationsPerMonth,
          creditCost: jobSeekerBillingConfig.applicationCreditCost,
        });

        return {
          ...result.submission,
          billing: result.monetization,
        };
      }

      return await repo.createSubmission({
        jobApplicationId: input.jobApplicationId,
        submittedByUserId: input.auth.userId as string,
        submittedByCompanyId: applicantCompanyId,
        message: input.message,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
        const details = (error as Error & { details?: unknown }).details;
        throw new AppError(
          402,
          "INSUFFICIENT_CREDITS",
          "Monthly free applications exhausted and not enough credits for this action",
          details,
        );
      }

      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "ALREADY_APPLIED", "You have already applied to this listing");
      }

      throw error;
    }
  }

  async listSubmissionsForMyListing(auth: AuthContext, jobApplicationId: string) {
    requireAuth(auth);

    const listing = await repo.getById(jobApplicationId);
    if (!listing) {
      throw new AppError(404, "JOB_APPLICATION_NOT_FOUND", "Job application not found");
    }

    if (listing.createdByUserId !== auth.userId) {
      throw new AppError(403, "FORBIDDEN", "You can only view submissions for your own listings");
    }

    return repo.listSubmissionsForJobApplication(jobApplicationId);
  }
}
