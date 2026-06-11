-- CreateEnum
CREATE TYPE "CompanyInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "CompanyInvite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "targetRole" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "CompanyInviteStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvite_token_key" ON "CompanyInvite"("token");

-- CreateIndex
CREATE INDEX "CompanyInvite_companyId_status_idx" ON "CompanyInvite"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanyInvite_invitedEmail_status_idx" ON "CompanyInvite"("invitedEmail", "status");

-- CreateIndex
CREATE INDEX "CompanyInvite_expiresAt_idx" ON "CompanyInvite"("expiresAt");

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

