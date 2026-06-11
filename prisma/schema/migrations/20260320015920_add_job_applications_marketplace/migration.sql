-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('OPEN', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobApplicationSubmissionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdByCompanyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "preferredCountryCode" TEXT,
    "preferredCity" TEXT,
    "expectedPayAmount" DECIMAL(12,2),
    "currency" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplicationSubmission" (
    "id" TEXT NOT NULL,
    "jobApplicationId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "submittedByCompanyId" TEXT,
    "message" TEXT,
    "status" "JobApplicationSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplicationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplication_createdByUserId_idx" ON "JobApplication"("createdByUserId");

-- CreateIndex
CREATE INDEX "JobApplication_createdByCompanyId_idx" ON "JobApplication"("createdByCompanyId");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "JobApplication_preferredCountryCode_preferredCity_idx" ON "JobApplication"("preferredCountryCode", "preferredCity");

-- CreateIndex
CREATE INDEX "JobApplicationSubmission_submittedByCompanyId_idx" ON "JobApplicationSubmission"("submittedByCompanyId");

-- CreateIndex
CREATE INDEX "JobApplicationSubmission_status_idx" ON "JobApplicationSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplicationSubmission_jobApplicationId_submittedByUserId_key" ON "JobApplicationSubmission"("jobApplicationId", "submittedByUserId");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_createdByCompanyId_fkey" FOREIGN KEY ("createdByCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationSubmission" ADD CONSTRAINT "JobApplicationSubmission_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationSubmission" ADD CONSTRAINT "JobApplicationSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationSubmission" ADD CONSTRAINT "JobApplicationSubmission_submittedByCompanyId_fkey" FOREIGN KEY ("submittedByCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
