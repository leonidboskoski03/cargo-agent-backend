ALTER TABLE "JobApplication"
ADD COLUMN "isPromoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotedUntil" TIMESTAMP(3);

CREATE INDEX "JobApplication_isPromoted_idx" ON "JobApplication"("isPromoted");

ALTER TABLE "JobApplicationSubmission"
ADD COLUMN "isPromoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotedUntil" TIMESTAMP(3);

CREATE INDEX "JobApplicationSubmission_isPromoted_idx" ON "JobApplicationSubmission"("isPromoted");

