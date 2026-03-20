-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BID_ACCEPTED', 'CONTRACT_CREATED', 'REVIEW_PUBLISHED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('COMPANY_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE', 'CONTRACT_ATTACHMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientUserId" TEXT,
    "recipientCompanyId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payloadJson" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "ownerCompanyId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metadataJson" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_createdAt_idx" ON "Notification"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientCompanyId_createdAt_idx" ON "Notification"("recipientCompanyId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Document_ownerUserId_createdAt_idx" ON "Document"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_ownerCompanyId_createdAt_idx" ON "Document"("ownerCompanyId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_kind_idx" ON "Document"("kind");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientCompanyId_fkey" FOREIGN KEY ("recipientCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce exactly one notification recipient target
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_exactly_one_recipient_chk"
CHECK (
  (CASE WHEN "recipientUserId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "recipientCompanyId" IS NULL THEN 0 ELSE 1 END) = 1
);

-- Enforce exactly one document owner target
ALTER TABLE "Document"
ADD CONSTRAINT "Document_exactly_one_owner_chk"
CHECK (
  (CASE WHEN "ownerUserId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "ownerCompanyId" IS NULL THEN 0 ELSE 1 END) = 1
);

