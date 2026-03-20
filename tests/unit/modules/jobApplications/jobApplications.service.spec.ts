import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobApplicationsService } from "../../../../src/modules/jobApplications/jobApplications.service.js";
import { JobApplicationsRepository } from "../../../../src/modules/jobApplications/jobApplications.repository.js";
import { Roles } from "../../../../src/shared/auth/permissions.js";

describe("JobApplicationsService edge cases", () => {
  const service = new JobApplicationsService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects company role create when companyId is missing", async () => {
    await expect(
      service.create({
        auth: {
          userId: "user_1",
          role: Roles.COMPANY_ADMIN,
        },
        body: {
          title: "Driver available",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "COMPANY_REQUIRED",
    });
  });

  it("rejects job seeker applying to non-company listing", async () => {
    vi.spyOn(JobApplicationsRepository.prototype, "getById").mockResolvedValue({
      id: "job_1",
      createdByUserId: "creator_1",
      createdByCompanyId: null,
    } as never);

    await expect(
      service.apply({
        auth: {
          userId: "jobseeker_1",
          role: Roles.JOB_SEEKER,
        },
        jobApplicationId: "job_1",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "INVALID_APPLICATION_TARGET",
    });
  });

  it("returns insufficient credits when job seeker free quota is exhausted", async () => {
    vi.spyOn(JobApplicationsRepository.prototype, "getById").mockResolvedValue({
      id: "job_2",
      createdByUserId: "creator_2",
      createdByCompanyId: "company_1",
    } as never);

    const insufficient = Object.assign(new Error("INSUFFICIENT_CREDITS"), {
      details: {
        creditCost: 1,
        walletBalanceCredits: 0,
        freeMonthlyLimit: 10,
        remainingFreeApplications: 0,
      },
    });

    vi.spyOn(JobApplicationsRepository.prototype, "createJobSeekerSubmissionWithMonetization").mockRejectedValue(
      insufficient,
    );

    await expect(
      service.apply({
        auth: {
          userId: "jobseeker_2",
          role: Roles.JOB_SEEKER,
        },
        jobApplicationId: "job_2",
      }),
    ).rejects.toMatchObject({
      statusCode: 402,
      code: "INSUFFICIENT_CREDITS",
      details: {
        creditCost: 1,
        walletBalanceCredits: 0,
        freeMonthlyLimit: 10,
        remainingFreeApplications: 0,
      },
    });
  });

  it("returns billing metadata when job seeker submission succeeds", async () => {
    vi.spyOn(JobApplicationsRepository.prototype, "getById").mockResolvedValue({
      id: "job_3",
      createdByUserId: "creator_3",
      createdByCompanyId: "company_1",
    } as never);

    vi.spyOn(JobApplicationsRepository.prototype, "createJobSeekerSubmissionWithMonetization").mockResolvedValue({
      submission: {
        id: "submission_1",
        jobApplicationId: "job_3",
        submittedByUserId: "jobseeker_3",
        submittedByCompanyId: null,
        message: "hello",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      monetization: {
        mode: "FREE_QUOTA",
        freeMonthlyLimit: 10,
        usedThisMonth: 1,
        remainingFreeApplications: 9,
        creditCost: 1,
        walletBalanceCredits: 0,
      },
    } as never);

    const result = await service.apply({
      auth: {
        userId: "jobseeker_3",
        role: Roles.JOB_SEEKER,
      },
      jobApplicationId: "job_3",
      message: "hello",
    });

    expect(result).toMatchObject({
      id: "submission_1",
      billing: {
        mode: "FREE_QUOTA",
        remainingFreeApplications: 9,
        creditCost: 1,
      },
    });
  });
});

