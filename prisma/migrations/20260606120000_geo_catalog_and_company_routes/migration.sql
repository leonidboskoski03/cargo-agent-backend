-- Supported localization/geo catalogs used by the frontend selectors.
CREATE TABLE "SupportedCountry" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportedCountry_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "SupportedCity" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportedCity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportedCountry_isActive_name_idx" ON "SupportedCountry"("isActive", "name");
CREATE UNIQUE INDEX "SupportedCity_countryCode_name_region_key" ON "SupportedCity"("countryCode", "name", "region");
CREATE INDEX "SupportedCity_countryCode_isActive_name_idx" ON "SupportedCity"("countryCode", "isActive", "name");

ALTER TABLE "SupportedCity" ADD CONSTRAINT "SupportedCity_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "SupportedCountry"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- Routes become company-owned. Existing legacy routes remain NULL and are hidden from normal company route lists.
DROP INDEX IF EXISTS "Route_originLocationId_destinationLocationId_key";
ALTER TABLE "Route" ADD COLUMN "companyId" TEXT;
CREATE INDEX "Route_companyId_idx" ON "Route"("companyId");
CREATE UNIQUE INDEX "Route_companyId_originLocationId_destinationLocationId_key" ON "Route"("companyId", "originLocationId", "destinationLocationId");
ALTER TABLE "Route" ADD CONSTRAINT "Route_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
