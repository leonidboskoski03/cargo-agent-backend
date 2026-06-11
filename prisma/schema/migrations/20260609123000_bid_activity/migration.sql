CREATE TYPE "BidActivityType" AS ENUM (
  'CREATED',
  'UPDATED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'DELETED',
  'RESTORED',
  'CONTRACT_CREATED'
);

CREATE TABLE "BidActivity" (
  "id" TEXT NOT NULL,
  "bidId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorCompanyId" TEXT,
  "type" "BidActivityType" NOT NULL,
  "message" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BidActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BidActivity_bidId_createdAt_idx" ON "BidActivity"("bidId", "createdAt");
CREATE INDEX "BidActivity_actorCompanyId_idx" ON "BidActivity"("actorCompanyId");
CREATE INDEX "BidActivity_type_idx" ON "BidActivity"("type");

ALTER TABLE "BidActivity"
ADD CONSTRAINT "BidActivity_bidId_fkey"
FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
