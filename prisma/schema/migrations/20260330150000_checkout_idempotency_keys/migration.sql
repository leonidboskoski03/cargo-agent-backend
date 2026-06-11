ALTER TABLE "CheckoutSession"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "CheckoutSession_companyId_idempotencyKey_key"
ON "CheckoutSession"("companyId", "idempotencyKey");

ALTER TABLE "JobSeekerCheckoutSession"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "JobSeekerCheckoutSession_userId_idempotencyKey_key"
ON "JobSeekerCheckoutSession"("userId", "idempotencyKey");

