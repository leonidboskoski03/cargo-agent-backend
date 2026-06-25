CREATE TABLE "VehicleMarketplaceInquiryReply" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorCompanyId" TEXT,
    "message" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMarketplaceInquiryReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobApplicationSubmissionReply" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorCompanyId" TEXT,
    "message" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplicationSubmissionReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BidReply" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorCompanyId" TEXT,
    "message" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleMarketplaceInquiryReply_inquiryId_createdAt_idx" ON "VehicleMarketplaceInquiryReply"("inquiryId", "createdAt");
CREATE INDEX "VehicleMarketplaceInquiryReply_authorUserId_idx" ON "VehicleMarketplaceInquiryReply"("authorUserId");
CREATE INDEX "VehicleMarketplaceInquiryReply_authorCompanyId_idx" ON "VehicleMarketplaceInquiryReply"("authorCompanyId");
CREATE INDEX "VehicleMarketplaceInquiryReply_deletedAt_idx" ON "VehicleMarketplaceInquiryReply"("deletedAt");

CREATE INDEX "JobApplicationSubmissionReply_submissionId_createdAt_idx" ON "JobApplicationSubmissionReply"("submissionId", "createdAt");
CREATE INDEX "JobApplicationSubmissionReply_authorUserId_idx" ON "JobApplicationSubmissionReply"("authorUserId");
CREATE INDEX "JobApplicationSubmissionReply_authorCompanyId_idx" ON "JobApplicationSubmissionReply"("authorCompanyId");
CREATE INDEX "JobApplicationSubmissionReply_deletedAt_idx" ON "JobApplicationSubmissionReply"("deletedAt");

CREATE INDEX "BidReply_bidId_createdAt_idx" ON "BidReply"("bidId", "createdAt");
CREATE INDEX "BidReply_authorUserId_idx" ON "BidReply"("authorUserId");
CREATE INDEX "BidReply_authorCompanyId_idx" ON "BidReply"("authorCompanyId");
CREATE INDEX "BidReply_deletedAt_idx" ON "BidReply"("deletedAt");

ALTER TABLE "VehicleMarketplaceInquiryReply"
ADD CONSTRAINT "VehicleMarketplaceInquiryReply_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "VehicleMarketplaceInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobApplicationSubmissionReply"
ADD CONSTRAINT "JobApplicationSubmissionReply_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "JobApplicationSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BidReply"
ADD CONSTRAINT "BidReply_bidId_fkey"
FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
