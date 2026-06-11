-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER_VERIFY', 'FORGOT_PASSWORD', 'CHANGE_PASSWORD', 'INVITE_ACCEPT', 'LOGIN_MFA');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED', 'CANCELED');

-- CreateTable
CREATE TABLE "AuthOtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "OtpChannel" NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "destination" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "nextResendAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "requestedIp" TEXT,
    "requestedAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthOtpChallenge_userId_createdAt_idx" ON "AuthOtpChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthOtpChallenge_destination_purpose_status_idx" ON "AuthOtpChallenge"("destination", "purpose", "status");

-- CreateIndex
CREATE INDEX "AuthOtpChallenge_expiresAt_idx" ON "AuthOtpChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthOtpChallenge" ADD CONSTRAINT "AuthOtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

