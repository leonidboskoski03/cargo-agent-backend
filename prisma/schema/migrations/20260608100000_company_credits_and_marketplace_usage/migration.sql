-- Add marketplace usage metrics.
ALTER TYPE "UsageMetric" ADD VALUE IF NOT EXISTS 'COMPANY_JOB_POSTS_PER_MONTH';
ALTER TYPE "UsageMetric" ADD VALUE IF NOT EXISTS 'COMPANY_VEHICLE_LISTINGS_PER_MONTH';
ALTER TYPE "JobSeekerUsageMetric" ADD VALUE IF NOT EXISTS 'VEHICLE_LISTINGS_PER_MONTH';

-- Company credit wallet/checkout enums.
CREATE TYPE "CompanyCreditTxType" AS ENUM ('PURCHASE', 'SPEND', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "CompanyCreditCheckoutSessionStatus" AS ENUM ('CREATED', 'COMPLETED', 'EXPIRED', 'FAILED');

CREATE TABLE "CompanyCreditWallet" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "balanceCredits" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyCreditWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyCreditTransaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "CompanyCreditTxType" NOT NULL,
  "amountCredits" INTEGER NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "stripePaymentRef" TEXT,
  "balanceAfter" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyCreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyCreditPack" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "priceAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "stripePriceId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyCreditPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyCreditCheckoutSession" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "creditPackId" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "status" "CompanyCreditCheckoutSessionStatus" NOT NULL DEFAULT 'CREATED',
  "stripeCheckoutSessionId" TEXT NOT NULL,
  "amountCredits" INTEGER NOT NULL,
  "amountPaid" DECIMAL(10,2),
  "currency" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyCreditCheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyCreditWallet_companyId_key" ON "CompanyCreditWallet"("companyId");
CREATE INDEX "CompanyCreditTransaction_companyId_createdAt_idx" ON "CompanyCreditTransaction"("companyId", "createdAt");
CREATE INDEX "CompanyCreditTransaction_walletId_createdAt_idx" ON "CompanyCreditTransaction"("walletId", "createdAt");
CREATE INDEX "CompanyCreditTransaction_referenceType_referenceId_idx" ON "CompanyCreditTransaction"("referenceType", "referenceId");
CREATE INDEX "CompanyCreditTransaction_stripePaymentRef_idx" ON "CompanyCreditTransaction"("stripePaymentRef");
CREATE UNIQUE INDEX "CompanyCreditPack_code_key" ON "CompanyCreditPack"("code");
CREATE UNIQUE INDEX "CompanyCreditPack_stripePriceId_key" ON "CompanyCreditPack"("stripePriceId");
CREATE INDEX "CompanyCreditCheckoutSession_companyId_createdAt_idx" ON "CompanyCreditCheckoutSession"("companyId", "createdAt");
CREATE INDEX "CompanyCreditCheckoutSession_status_idx" ON "CompanyCreditCheckoutSession"("status");
CREATE INDEX "CompanyCreditCheckoutSession_expiresAt_idx" ON "CompanyCreditCheckoutSession"("expiresAt");
CREATE UNIQUE INDEX "CompanyCreditCheckoutSession_stripeCheckoutSessionId_key" ON "CompanyCreditCheckoutSession"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "CompanyCreditCheckoutSession_companyId_idempotencyKey_key" ON "CompanyCreditCheckoutSession"("companyId", "idempotencyKey");

ALTER TABLE "CompanyCreditWallet" ADD CONSTRAINT "CompanyCreditWallet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyCreditTransaction" ADD CONSTRAINT "CompanyCreditTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CompanyCreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyCreditTransaction" ADD CONSTRAINT "CompanyCreditTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyCreditCheckoutSession" ADD CONSTRAINT "CompanyCreditCheckoutSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyCreditCheckoutSession" ADD CONSTRAINT "CompanyCreditCheckoutSession_creditPackId_fkey" FOREIGN KEY ("creditPackId") REFERENCES "CompanyCreditPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
