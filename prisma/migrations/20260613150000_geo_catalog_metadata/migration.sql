ALTER TABLE "SupportedCountry"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "lat" DECIMAL(10,7),
ADD COLUMN "lng" DECIMAL(10,7);

ALTER TABLE "SupportedCity"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "adminCode" TEXT;

CREATE INDEX "SupportedCountry_region_isActive_idx" ON "SupportedCountry"("region", "isActive");
