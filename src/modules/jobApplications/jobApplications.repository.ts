import { JobSeekerCreditTxType, JobSeekerUsageMetric, Prisma } from "@prisma/client";
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
      where: { status: "OPEN", createdByCompanyId: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { createdByCompany: true, createdByUser: true },
    });
  }

  async listOpenForCompany() {
    return prisma.jobApplication.findMany({
      where: { status: "OPEN", createdByCompanyId: null },
      orderBy: { createdAt: "desc" },
      include: { createdByCompany: true, createdByUser: true },
    });
  }

  async listCreatedByUser(userId: string) {
    return prisma.jobApplication.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: "desc" },
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
      orderBy: { createdAt: "desc" },
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

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

