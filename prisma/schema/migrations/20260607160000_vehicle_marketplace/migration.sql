-- CreateEnum
CREATE TYPE "VehicleMarketplaceIntent" AS ENUM ('SALE', 'RENTAL', 'LEASE');

-- CreateEnum
CREATE TYPE "VehicleMarketplaceSourceType" AS ENUM ('FLEET_VEHICLE', 'STANDALONE');

-- CreateEnum
CREATE TYPE "VehicleMarketplaceListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD', 'RENTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VehicleMarketplaceInquiryStatus" AS ENUM ('OPEN', 'RESPONDED', 'CLOSED');

-- CreateTable
CREATE TABLE "VehicleMarketplaceListing" (
    "id" TEXT NOT NULL,
    "ownerCompanyId" TEXT,
    "ownerUserId" TEXT,
    "vehicleId" TEXT,
    "intent" "VehicleMarketplaceIntent" NOT NULL,
    "sourceType" "VehicleMarketplaceSourceType" NOT NULL,
    "status" "VehicleMarketplaceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "bodyType" "VehicleBodyType",
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "countryCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "priceAmount" DECIMAL(12,2),
    "currency" TEXT,
    "capacityKg" INTEGER,
    "volumeM3" DECIMAL(10,3),
    "refrigerated" BOOLEAN DEFAULT false,
    "hazmatCertified" BOOLEAN DEFAULT false,
    "imageUrlsJson" JSONB,
    "documentsJson" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMarketplaceInquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderCompanyId" TEXT,
    "message" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" "VehicleMarketplaceInquiryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMarketplaceInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleMarketplaceListing_ownerCompanyId_idx" ON "VehicleMarketplaceListing"("ownerCompanyId");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceListing_ownerUserId_idx" ON "VehicleMarketplaceListing"("ownerUserId");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceListing_vehicleId_idx" ON "VehicleMarketplaceListing"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceListing_status_intent_vehicleType_idx" ON "VehicleMarketplaceListing"("status", "intent", "vehicleType");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceListing_countryCode_city_idx" ON "VehicleMarketplaceListing"("countryCode", "city");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceListing_brand_model_idx" ON "VehicleMarketplaceListing"("brand", "model");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceListing_createdAt_idx" ON "VehicleMarketplaceListing"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceInquiry_listingId_idx" ON "VehicleMarketplaceInquiry"("listingId");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceInquiry_senderUserId_idx" ON "VehicleMarketplaceInquiry"("senderUserId");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceInquiry_senderCompanyId_idx" ON "VehicleMarketplaceInquiry"("senderCompanyId");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceInquiry_status_idx" ON "VehicleMarketplaceInquiry"("status");

-- CreateIndex
CREATE INDEX "VehicleMarketplaceInquiry_createdAt_idx" ON "VehicleMarketplaceInquiry"("createdAt");

-- AddForeignKey
ALTER TABLE "VehicleMarketplaceListing" ADD CONSTRAINT "VehicleMarketplaceListing_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMarketplaceListing" ADD CONSTRAINT "VehicleMarketplaceListing_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMarketplaceListing" ADD CONSTRAINT "VehicleMarketplaceListing_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMarketplaceInquiry" ADD CONSTRAINT "VehicleMarketplaceInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VehicleMarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMarketplaceInquiry" ADD CONSTRAINT "VehicleMarketplaceInquiry_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMarketplaceInquiry" ADD CONSTRAINT "VehicleMarketplaceInquiry_senderCompanyId_fkey" FOREIGN KEY ("senderCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
