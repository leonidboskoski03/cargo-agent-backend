import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, UserRole, VehicleMarketplaceListingStatus } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("vehicle marketplace endpoints", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("enforces ownership, published feed behavior, restore, and inquiry permissions", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = `${Date.now()}-vm`;

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Market Carrier ${suffix}`,
        registrationNumber: `VM-CAR-${suffix}`,
        countryCode: "MK",
        city: "Skopje",
      },
    });
    const otherCompany = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Other Carrier ${suffix}`,
        registrationNumber: `VM-OTH-${suffix}`,
        countryCode: "MK",
        city: "Bitola",
      },
    });
    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Vehicle",
        lastName: "Admin",
        email: `vehicle-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });
    const driver = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_DRIVER,
        firstName: "Vehicle",
        lastName: "Driver",
        email: `vehicle-driver-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });
    const otherAdmin = await prisma.user.create({
      data: {
        companyId: otherCompany.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Other",
        lastName: "Admin",
        email: `other-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });
    const jobSeeker = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Job",
        lastName: "Seeker",
        email: `vehicle-seeker-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });
    const vehicle = await prisma.vehicle.create({
      data: {
        companyId: company.id,
        vehicleType: "TRUCK",
        plateNumber: `VM-${suffix}`,
        countryOfRegistration: "MK",
        brand: "MAN",
        model: "TGX",
        year: 2023,
        bodyType: "BOX",
        capacityKg: 12000,
        volumeM3: "45.5",
        refrigerated: false,
        hazmatCertified: true,
        imageUrl: "https://example.com/truck.jpg",
      },
    });

    const adminAuth = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });
    const driverAuth = authHeader(signAccessToken, {
      userId: driver.id,
      role: driver.role,
      companyId: company.id,
      email: driver.email,
    });
    const otherAdminAuth = authHeader(signAccessToken, {
      userId: otherAdmin.id,
      role: otherAdmin.role,
      companyId: otherCompany.id,
      email: otherAdmin.email,
    });
    const jobSeekerAuth = authHeader(signAccessToken, {
      userId: jobSeeker.id,
      role: jobSeeker.role,
      email: jobSeeker.email,
    });

    let fleetListingId = "";
    let seekerListingId = "";
    let inquiryId = "";

    try {
      const createFleetListing = await request(app).post("/api/v1/vehicle-marketplace").set("Authorization", adminAuth).send({
        title: "MAN TGX for rent",
        description: "Clean truck available for regional rental.",
        intent: "RENTAL",
        sourceType: "FLEET_VEHICLE",
        status: "PUBLISHED",
        vehicleId: vehicle.id,
        vehicleType: "TRUCK",
        countryCode: "mk",
        city: "Skopje",
        priceAmount: "900",
        currency: "eur",
      });
      expect(createFleetListing.statusCode).toBe(201);
      fleetListingId = createFleetListing.body.data.id as string;
      expect(createFleetListing.body.data.ownerCompanyId).toBe(company.id);
      expect(createFleetListing.body.data.brand).toBe("MAN");
      expect(createFleetListing.body.data.currency).toBe("EUR");
      expect(createFleetListing.body.data.billing.mode).toBe("INCLUDED_QUOTA");

      const otherCompanyListing = await request(app).post("/api/v1/vehicle-marketplace").set("Authorization", otherAdminAuth).send({
        title: "Blocked fleet listing",
        intent: "SALE",
        sourceType: "FLEET_VEHICLE",
        status: "PUBLISHED",
        vehicleId: vehicle.id,
        vehicleType: "TRUCK",
        countryCode: "MK",
        city: "Skopje",
      });
      expect(otherCompanyListing.statusCode).toBe(403);

      const driverCreate = await request(app).post("/api/v1/vehicle-marketplace").set("Authorization", driverAuth).send({
        title: "Driver cannot sell",
        intent: "SALE",
        sourceType: "STANDALONE",
        status: "PUBLISHED",
        vehicleType: "VAN",
        countryCode: "MK",
        city: "Skopje",
      });
      expect(driverCreate.statusCode).toBe(403);

      const createSeekerListing = await request(app).post("/api/v1/vehicle-marketplace").set("Authorization", jobSeekerAuth).send({
        title: "Trailer for sale",
        intent: "SALE",
        sourceType: "STANDALONE",
        status: "DRAFT",
        vehicleType: "TRAILER",
        bodyType: "FLATBED",
        brand: "Schmitz",
        model: "S01",
        year: 2021,
        countryCode: "RS",
        city: "Nis",
        priceAmount: "18000",
        currency: "EUR",
      });
      expect(createSeekerListing.statusCode).toBe(201);
      seekerListingId = createSeekerListing.body.data.id as string;
      expect(createSeekerListing.body.data.ownerUserId).toBe(jobSeeker.id);
      expect(createSeekerListing.body.data.billing).toBeUndefined();

      const publishSeekerListing = await request(app)
        .patch(`/api/v1/vehicle-marketplace/${seekerListingId}`)
        .set("Authorization", jobSeekerAuth)
        .send({ status: "PUBLISHED" });
      expect(publishSeekerListing.statusCode).toBe(200);
      expect(publishSeekerListing.body.data.billing.mode).toBe("INCLUDED_QUOTA");

      await request(app)
        .patch(`/api/v1/vehicle-marketplace/${seekerListingId}`)
        .set("Authorization", jobSeekerAuth)
        .send({ status: "DRAFT" });

      const publicList = await request(app)
        .get("/api/v1/vehicle-marketplace")
        .query({ q: "man", countryCode: "MK", page: 1, pageSize: 10 })
        .set("Authorization", driverAuth);
      expect(publicList.statusCode).toBe(200);
      expect((publicList.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(fleetListingId);
      expect((publicList.body.data as Array<{ id: string }>).map((item) => item.id)).not.toContain(seekerListingId);
      expect(publicList.body.meta.pagination.total).toBeGreaterThanOrEqual(1);

      const hiddenStatusList = await request(app)
        .get("/api/v1/vehicle-marketplace")
        .query({ status: "DRAFT" })
        .set("Authorization", adminAuth);
      expect(hiddenStatusList.statusCode).toBe(200);
      expect(hiddenStatusList.body.data).toEqual([]);

      const mine = await request(app).get("/api/v1/vehicle-marketplace/mine").set("Authorization", jobSeekerAuth);
      expect(mine.statusCode).toBe(200);
      expect((mine.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(seekerListingId);

      const forbiddenUpdate = await request(app)
        .patch(`/api/v1/vehicle-marketplace/${fleetListingId}`)
        .set("Authorization", otherAdminAuth)
        .send({ title: "Not yours" });
      expect(forbiddenUpdate.statusCode).toBe(403);

      const updateListing = await request(app)
        .patch(`/api/v1/vehicle-marketplace/${fleetListingId}`)
        .set("Authorization", adminAuth)
        .send({ status: "PAUSED" });
      expect(updateListing.statusCode).toBe(200);
      expect(updateListing.body.data.status).toBe(VehicleMarketplaceListingStatus.PAUSED);

      const pausedPublicDetail = await request(app).get(`/api/v1/vehicle-marketplace/${fleetListingId}`).set("Authorization", driverAuth);
      expect(pausedPublicDetail.statusCode).toBe(404);

      await prisma.vehicleMarketplaceListing.update({ where: { id: fleetListingId }, data: { status: "PUBLISHED" } });

      const inquiry = await request(app).post(`/api/v1/vehicle-marketplace/${fleetListingId}/inquiries`).set("Authorization", jobSeekerAuth).send({
        message: "Is this truck available next month?",
        contactEmail: "buyer@test.local",
      });
      expect(inquiry.statusCode).toBe(201);
      inquiryId = inquiry.body.data.id as string;

      const ownerInquiries = await request(app).get("/api/v1/vehicle-marketplace/inquiries").set("Authorization", adminAuth);
      expect(ownerInquiries.statusCode).toBe(200);
      expect((ownerInquiries.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(inquiryId);

      const senderRespond = await request(app)
        .patch(`/api/v1/vehicle-marketplace/inquiries/${inquiryId}`)
        .set("Authorization", jobSeekerAuth)
        .send({ status: "RESPONDED" });
      expect(senderRespond.statusCode).toBe(403);

      const ownerRespond = await request(app)
        .patch(`/api/v1/vehicle-marketplace/inquiries/${inquiryId}`)
        .set("Authorization", adminAuth)
        .send({ status: "RESPONDED" });
      expect(ownerRespond.statusCode).toBe(200);
      expect(ownerRespond.body.data.status).toBe("RESPONDED");

      const deleteListing = await request(app).delete(`/api/v1/vehicle-marketplace/${fleetListingId}`).set("Authorization", adminAuth);
      expect(deleteListing.statusCode).toBe(200);

      const deletedDetail = await request(app).get(`/api/v1/vehicle-marketplace/${fleetListingId}`).set("Authorization", adminAuth);
      expect(deletedDetail.statusCode).toBe(404);

      const mineWithDeleted = await request(app)
        .get("/api/v1/vehicle-marketplace/mine")
        .query({ includeDeleted: "true" })
        .set("Authorization", adminAuth);
      expect(mineWithDeleted.statusCode).toBe(200);
      const deletedOwnedListing = (mineWithDeleted.body.data as Array<{ deletedAt: string | null; id: string }>).find(
        (item) => item.id === fleetListingId,
      );
      expect(deletedOwnedListing?.deletedAt).toBeTruthy();

      const restoreListing = await request(app).post(`/api/v1/vehicle-marketplace/${fleetListingId}/restore`).set("Authorization", adminAuth).send({});
      expect(restoreListing.statusCode).toBe(200);
      expect(restoreListing.body.data.deletedAt).toBeNull();
    } finally {
      await prisma.vehicleMarketplaceInquiry.deleteMany({ where: { id: inquiryId } });
      await prisma.vehicleMarketplaceListing.deleteMany({ where: { id: { in: [fleetListingId, seekerListingId].filter(Boolean) } } });
      await prisma.vehicle.deleteMany({ where: { id: vehicle.id } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, driver.id, otherAdmin.id, jobSeeker.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [company.id, otherCompany.id] } } });
    }
  }, 30_000);
});
