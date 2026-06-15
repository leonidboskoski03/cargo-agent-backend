ALTER TABLE "Location"
ADD COLUMN "companyId" TEXT;

CREATE INDEX "Location_companyId_idx" ON "Location"("companyId");

ALTER TABLE "Location"
ADD CONSTRAINT "Location_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
