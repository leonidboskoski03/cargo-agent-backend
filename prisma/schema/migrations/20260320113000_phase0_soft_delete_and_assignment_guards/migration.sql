-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "License" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VehicleAssignment"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Route" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobApplicationSubmission" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Review"
ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "VehicleAssignment_driverUserId_startsAt_endsAt_idx"
ON "VehicleAssignment"("driverUserId", "startsAt", "endsAt");

-- Guard against inverted ranges
ALTER TABLE "VehicleAssignment"
ADD CONSTRAINT "VehicleAssignment_valid_time_window_chk"
CHECK ("endsAt" IS NULL OR "startsAt" < "endsAt");

-- Use GiST for exclusion constraints with scalar equality
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent one driver from being assigned to overlapping active windows
ALTER TABLE "VehicleAssignment"
ADD CONSTRAINT "VehicleAssignment_driverUserId_time_overlap_excl"
EXCLUDE USING gist (
  "driverUserId" WITH =,
  tsrange("startsAt", COALESCE("endsAt", 'infinity'::timestamp)) WITH &&
)
WHERE ("deletedAt" IS NULL);

