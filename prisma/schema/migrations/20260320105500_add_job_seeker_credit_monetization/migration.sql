-- CreateEnum
CREATE TYPE "JobSeekerUsageMetric" AS ENUM ('JOB_APPLICATIONS_PER_MONTH', 'ACTIVE_LOOKING_LISTINGS');

-- CreateEnum
CREATE TYPE "JobSeekerCreditTxType" AS ENUM ('PURCHASE', 'SPEND', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "JobSeekerCheckoutSessionStatus" AS ENUM ('CREATED', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "JobSeekerWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceCredits" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeekerWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeekerCreditTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "JobSeekerCreditTxType" NOT NULL,
    "amountCredits" INTEGER NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "stripePaymentRef" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSeekerCreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeekerCreditPack" (
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

    CONSTRAINT "JobSeekerCreditPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeekerUsageCounter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" "JobSeekerUsageMetric" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "limitSnapshot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeekerUsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeekerCheckoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditPackId" TEXT NOT NULL,
    "status" "JobSeekerCheckoutSessionStatus" NOT NULL DEFAULT 'CREATED',
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "amountCredits" INTEGER NOT NULL,
    "amountPaid" DECIMAL(10,2),
    "currency" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeekerCheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerWallet_userId_key" ON "JobSeekerWallet"("userId");

-- CreateIndex
CREATE INDEX "JobSeekerCreditTransaction_userId_createdAt_idx" ON "JobSeekerCreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JobSeekerCreditTransaction_walletId_createdAt_idx" ON "JobSeekerCreditTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "JobSeekerCreditTransaction_referenceType_referenceId_idx" ON "JobSeekerCreditTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "JobSeekerCreditTransaction_stripePaymentRef_idx" ON "JobSeekerCreditTransaction"("stripePaymentRef");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerCreditPack_code_key" ON "JobSeekerCreditPack"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerCreditPack_stripePriceId_key" ON "JobSeekerCreditPack"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerUsageCounter_userId_metric_periodStart_key" ON "JobSeekerUsageCounter"("userId", "metric", "periodStart");

-- CreateIndex
CREATE INDEX "JobSeekerUsageCounter_userId_metric_periodStart_idx" ON "JobSeekerUsageCounter"("userId", "metric", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerCheckoutSession_stripeCheckoutSessionId_key" ON "JobSeekerCheckoutSession"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "JobSeekerCheckoutSession_userId_createdAt_idx" ON "JobSeekerCheckoutSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JobSeekerCheckoutSession_status_idx" ON "JobSeekerCheckoutSession"("status");

-- CreateIndex
CREATE INDEX "JobSeekerCheckoutSession_expiresAt_idx" ON "JobSeekerCheckoutSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "JobSeekerWallet" ADD CONSTRAINT "JobSeekerWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeekerCreditTransaction" ADD CONSTRAINT "JobSeekerCreditTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "JobSeekerWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeekerCreditTransaction" ADD CONSTRAINT "JobSeekerCreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeekerUsageCounter" ADD CONSTRAINT "JobSeekerUsageCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeekerCheckoutSession" ADD CONSTRAINT "JobSeekerCheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeekerCheckoutSession" ADD CONSTRAINT "JobSeekerCheckoutSession_creditPackId_fkey" FOREIGN KEY ("creditPackId") REFERENCES "JobSeekerCreditPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

