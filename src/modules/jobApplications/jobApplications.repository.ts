import { JobApplicationStatus, JobSeekerCreditTxType, JobSeekerUsageMetric, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

type CreateJobApplicationInput = {
  createdByUserId: string;
  createdByCompanyId?: string;
  title: string;
  description?: string;
  preferredCountryCode?: string;
  preferredCity?: string;
  expectedPayAmount?: number;
  currency?: string;
};

type CreateSubmissionInput = {
  jobApplicationId: string;
  submittedByUserId: string;
  submittedByCompanyId?: string;
  message?: string;
};

type UpdateJobApplicationInput = {
  currency?: string | null;
  description?: string | null;
  expectedPayAmount?: number | null;
  preferredCity?: string | null;
  preferredCountryCode?: string | null;
  status?: JobApplicationStatus;
  title?: string;
};

type CreateJobSeekerSubmissionInput = {
  jobApplicationId: string;
  submittedByUserId: string;
  message?: string;
  freeMonthlyLimit: number;
  creditCost: number;
};

type JobSeekerSubmissionResult = {
  submission: {
    id: string;
    jobApplicationId: string;
    submittedByUserId: string;
    submittedByCompanyId: string | null;
    message: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  monetization: {
    mode: "FREE_QUOTA" | "CREDITS";
    freeMonthlyLimit: number;
    usedThisMonth: number;
    remainingFreeApplications: number;
    creditCost: number;
    walletBalanceCredits: number;
  };
};

function getCurrentMonthPeriodStartUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export class JobApplicationsRepository {
  async create(input: CreateJobApplicationInput) {
    return prisma.jobApplication.create({
      data: {
        createdByUserId: input.createdByUserId,
        createdByCompanyId: input.createdByCompanyId ?? null,
        title: input.title,
        description: input.description,
        preferredCountryCode: input.preferredCountryCode,
        preferredCity: input.preferredCity,
        expectedPayAmount: input.expectedPayAmount,
        currency: input.currency?.toUpperCase(),
      },
    });
  }

  async listOpenForJobSeeker() {
    return prisma.jobApplication.findMany({
      where: { deletedAt: null, status: "OPEN", createdByCompanyId: { not: null } },
      orderBy: [{ isPromoted: "desc" }, { createdAt: "desc" }],
      include: { createdByCompany: true, createdByUser: true },
    });
  }

  async listOpenForCompany() {
    return prisma.jobApplication.findMany({
      where: { deletedAt: null, status: "OPEN", createdByCompanyId: null },
      orderBy: [{ isPromoted: "desc" }, { createdAt: "desc" }],
      include: { createdByCompany: true, createdByUser: true },
    });
  }

  async listCreatedByUser(userId: string) {
    return prisma.jobApplication.findMany({
      where: { createdByUserId: userId },
      orderBy: [{ isPromoted: "desc" }, { createdAt: "desc" }],
    });
  }

  async update(id: string, data: UpdateJobApplicationInput) {
    return prisma.jobApplication.update({
      where: { id },
      data: {
        ...data,
        currency: data.currency === undefined ? undefined : data.currency?.toUpperCase() ?? null,
      },
    });
  }

  async softDelete(id: string) {
    return prisma.jobApplication.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: JobApplicationStatus.CLOSED,
      },
    });
  }

  async restore(id: string) {
    return prisma.jobApplication.update({
      where: { id },
      data: {
        deletedAt: null,
        status: JobApplicationStatus.PAUSED,
      },
    });
  }

  async getById(id: string) {
    return prisma.jobApplication.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, companyId: true, role: true },
        },
      },
    });
  }

  async createSubmission(input: CreateSubmissionInput) {
    return prisma.jobApplicationSubmission.create({
      data: {
        jobApplicationId: input.jobApplicationId,
        submittedByUserId: input.submittedByUserId,
        submittedByCompanyId: input.submittedByCompanyId ?? null,
        message: input.message,
      },
    });
  }

  async createJobSeekerSubmissionWithMonetization(input: CreateJobSeekerSubmissionInput): Promise<JobSeekerSubmissionResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const submission = await tx.jobApplicationSubmission.create({
          data: {
            jobApplicationId: input.jobApplicationId,
            submittedByUserId: input.submittedByUserId,
            submittedByCompanyId: null,
            message: input.message,
          },
        });

        const periodStart = getCurrentMonthPeriodStartUtc();

        const counter = await tx.jobSeekerUsageCounter.upsert({
          where: {
            userId_metric_periodStart: {
              userId: input.submittedByUserId,
              metric: JobSeekerUsageMetric.JOB_APPLICATIONS_PER_MONTH,
              periodStart,
            },
          },
          create: {
            userId: input.submittedByUserId,
            metric: JobSeekerUsageMetric.JOB_APPLICATIONS_PER_MONTH,
            periodStart,
            used: 0,
            limitSnapshot: input.freeMonthlyLimit,
          },
          update: {
            limitSnapshot: input.freeMonthlyLimit,
          },
        });

        const freeQuotaUsed = await tx.jobSeekerUsageCounter.updateMany({
          where: {
            id: counter.id,
            used: {
              lt: input.freeMonthlyLimit,
            },
          },
          data: {
            used: {
              increment: 1,
            },
            limitSnapshot: input.freeMonthlyLimit,
          },
        });

        if (freeQuotaUsed.count > 0) {
          const wallet = await tx.jobSeekerWallet.findUnique({
            where: { userId: input.submittedByUserId },
            select: { balanceCredits: true },
          });

          const usedThisMonth = counter.used + 1;
          return {
            submission,
            monetization: {
              mode: "FREE_QUOTA",
              freeMonthlyLimit: input.freeMonthlyLimit,
              usedThisMonth,
              remainingFreeApplications: Math.max(input.freeMonthlyLimit - usedThisMonth, 0),
              creditCost: input.creditCost,
              walletBalanceCredits: wallet?.balanceCredits ?? 0,
            },
          };
        }

        const wallet =
          (await tx.jobSeekerWallet.findUnique({ where: { userId: input.submittedByUserId } })) ??
          (await tx.jobSeekerWallet.create({ data: { userId: input.submittedByUserId } }));

        const debit = await tx.jobSeekerWallet.updateMany({
          where: {
            id: wallet.id,
            balanceCredits: {
              gte: input.creditCost,
            },
          },
          data: {
            balanceCredits: {
              decrement: input.creditCost,
            },
            version: {
              increment: 1,
            },
          },
        });

        if (debit.count === 0) {
          throw Object.assign(new Error("INSUFFICIENT_CREDITS"), {
            details: {
              creditCost: input.creditCost,
              walletBalanceCredits: wallet.balanceCredits,
              freeMonthlyLimit: input.freeMonthlyLimit,
              remainingFreeApplications: 0,
            },
          });
        }

        const updatedWallet = await tx.jobSeekerWallet.findUnique({
          where: { id: wallet.id },
          select: { balanceCredits: true },
        });

        await tx.jobSeekerCreditTransaction.create({
          data: {
            walletId: wallet.id,
            userId: input.submittedByUserId,
            type: JobSeekerCreditTxType.SPEND,
            amountCredits: -input.creditCost,
            reasonCode: "JOB_APPLICATION_SUBMISSION",
            referenceType: "JOB_APPLICATION_SUBMISSION",
            referenceId: submission.id,
            balanceAfter: updatedWallet?.balanceCredits ?? 0,
          },
        });

        await tx.jobSeekerUsageCounter.update({
          where: { id: counter.id },
          data: {
            used: {
              increment: 1,
            },
          },
        });

        return {
          submission,
          monetization: {
            mode: "CREDITS",
            freeMonthlyLimit: input.freeMonthlyLimit,
            usedThisMonth: counter.used + 1,
            remainingFreeApplications: 0,
            creditCost: input.creditCost,
            walletBalanceCredits: updatedWallet?.balanceCredits ?? 0,
          },
        };
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
        throw error;
      }

      throw error;
    }
  }

  async listSubmissionsForJobApplication(jobApplicationId: string) {
    return prisma.jobApplicationSubmission.findMany({
      where: { jobApplicationId },
      orderBy: [{ isPromoted: "desc" }, { createdAt: "desc" }],
      include: {
        submittedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            companyId: true,
          },
        },
        submittedByCompany: true,
      },
    });
  }

  async promoteListingWithCredits(input: {
    jobApplicationId: string;
    userId: string;
    creditCost: number;
    promotedUntil: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.jobApplication.findUnique({
        where: { id: input.jobApplicationId },
        select: { id: true, createdByUserId: true },
      });

      if (!listing || listing.createdByUserId !== input.userId) {
        throw new Error("LISTING_NOT_FOUND_OR_FORBIDDEN");
      }

      const wallet =
        (await tx.jobSeekerWallet.findUnique({ where: { userId: input.userId } })) ??
        (await tx.jobSeekerWallet.create({ data: { userId: input.userId } }));

      const debited = await tx.jobSeekerWallet.updateMany({
        where: { id: wallet.id, balanceCredits: { gte: input.creditCost } },
        data: {
          balanceCredits: { decrement: input.creditCost },
          version: { increment: 1 },
        },
      });

      if (debited.count === 0) {
        throw Object.assign(new Error("INSUFFICIENT_CREDITS"), {
          details: {
            creditCost: input.creditCost,
            walletBalanceCredits: wallet.balanceCredits,
          },
        });
      }

      const promoted = await tx.jobApplication.update({
        where: { id: input.jobApplicationId },
        data: {
          isPromoted: true,
          promotedUntil: input.promotedUntil,
        },
      });

      const updatedWallet = await tx.jobSeekerWallet.findUnique({
        where: { id: wallet.id },
        select: { id: true, balanceCredits: true },
      });

      await tx.jobSeekerCreditTransaction.create({
        data: {
          walletId: wallet.id,
          userId: input.userId,
          type: JobSeekerCreditTxType.SPEND,
          amountCredits: -input.creditCost,
          reasonCode: "JOB_APPLICATION_PROMOTION",
          referenceType: "JOB_APPLICATION",
          referenceId: input.jobApplicationId,
          balanceAfter: updatedWallet?.balanceCredits ?? 0,
        },
      });

      return {
        listing: promoted,
        walletBalanceCredits: updatedWallet?.balanceCredits ?? 0,
      };
    });
  }

  async promoteSubmissionWithCredits(input: {
    submissionId: string;
    jobApplicationId: string;
    userId: string;
    creditCost: number;
    promotedUntil: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.jobApplicationSubmission.findUnique({
        where: { id: input.submissionId },
        select: { id: true, jobApplicationId: true, submittedByUserId: true },
      });

      if (!submission || submission.jobApplicationId !== input.jobApplicationId || submission.submittedByUserId !== input.userId) {
        throw new Error("SUBMISSION_NOT_FOUND_OR_FORBIDDEN");
      }

      const wallet =
        (await tx.jobSeekerWallet.findUnique({ where: { userId: input.userId } })) ??
        (await tx.jobSeekerWallet.create({ data: { userId: input.userId } }));

      const debited = await tx.jobSeekerWallet.updateMany({
        where: { id: wallet.id, balanceCredits: { gte: input.creditCost } },
        data: {
          balanceCredits: { decrement: input.creditCost },
          version: { increment: 1 },
        },
      });

      if (debited.count === 0) {
        throw Object.assign(new Error("INSUFFICIENT_CREDITS"), {
          details: {
            creditCost: input.creditCost,
            walletBalanceCredits: wallet.balanceCredits,
          },
        });
      }

      const promoted = await tx.jobApplicationSubmission.update({
        where: { id: input.submissionId },
        data: {
          isPromoted: true,
          promotedUntil: input.promotedUntil,
        },
      });

      const updatedWallet = await tx.jobSeekerWallet.findUnique({
        where: { id: wallet.id },
        select: { id: true, balanceCredits: true },
      });

      await tx.jobSeekerCreditTransaction.create({
        data: {
          walletId: wallet.id,
          userId: input.userId,
          type: JobSeekerCreditTxType.SPEND,
          amountCredits: -input.creditCost,
          reasonCode: "JOB_APPLICATION_SUBMISSION_PROMOTION",
          referenceType: "JOB_APPLICATION_SUBMISSION",
          referenceId: input.submissionId,
          balanceAfter: updatedWallet?.balanceCredits ?? 0,
        },
      });

      return {
        submission: promoted,
        walletBalanceCredits: updatedWallet?.balanceCredits ?? 0,
      };
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

