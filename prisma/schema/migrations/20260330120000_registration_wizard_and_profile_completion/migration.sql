-- Add user profile fields used by wizard onboarding and profile completion scoring.
ALTER TABLE "User"
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "headline" TEXT,
ADD COLUMN "yearsExperience" INTEGER,
ADD COLUMN "availability" TEXT,
ADD COLUMN "preferredRoutes" JSONB;

-- Registration draft state machine for multi-step onboarding.
CREATE TYPE "RegistrationKind" AS ENUM ('JOB_SEEKER', 'COMPANY');

CREATE TABLE "RegistrationDraft" (
  "id" TEXT NOT NULL,
  "kind" "RegistrationKind" NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "passwordHash" TEXT NOT NULL,
  "countryCode" TEXT,
  "city" TEXT,
  "headline" TEXT,
  "yearsExperience" INTEGER,
  "availability" TEXT,
  "preferredRoutes" JSONB,
  "companyName" TEXT,
  "companyType" "CompanyType",
  "companyRegistrationNumber" TEXT,
  "companyAddress" TEXT,
  "companyCountryCode" TEXT,
  "companyCity" TEXT,
  "companyVatNumber" TEXT,
  "companyPhone" TEXT,
  "companyEmail" TEXT,
  "companyWebsite" TEXT,
  "selectedPlanCode" "PlanCode",
  "otpChallengeId" TEXT,
  "otpVerifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationDraft_email_idx" ON "RegistrationDraft"("email");
CREATE INDEX "RegistrationDraft_kind_completedAt_idx" ON "RegistrationDraft"("kind", "completedAt");
CREATE INDEX "RegistrationDraft_expiresAt_idx" ON "RegistrationDraft"("expiresAt");

