CREATE TYPE "CompanyVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED', 'NEEDS_REVIEW');

ALTER TABLE "Company"
ADD COLUMN "verificationStatus" "CompanyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "verificationProvider" TEXT,
ADD COLUMN "verificationCheckedAt" TIMESTAMP(3),
ADD COLUMN "verificationFailureReason" TEXT,
ADD COLUMN "verificationDetails" JSONB;
