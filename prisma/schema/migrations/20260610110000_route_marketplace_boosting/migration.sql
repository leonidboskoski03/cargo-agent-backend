ALTER TYPE "BidActivityType" ADD VALUE IF NOT EXISTS 'BOOSTED';

ALTER TABLE "Bid"
  ADD COLUMN IF NOT EXISTS "boostCredits" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "boostedUntil" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Bid_boostedUntil_boostCredits_idx" ON "Bid"("boostedUntil", "boostCredits");
