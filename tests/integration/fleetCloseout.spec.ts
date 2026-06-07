import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("fleet closeout endpoints", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  }, 20_000);

  it("enforces admin mutation and driver read-only access across vehicles, licenses, and assignments", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = `${Date.now()}-fleet`;

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Fleet Co ${suffix}`,
        registrationNumber: `FLT-${suffix}`,
        countryCode: "RS",
        city: "Belgrade",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Fleet",
        lastName: "Admin",
        email: `fleet-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const driver = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_DRIVER,
        firstName: "Fleet",
        lastName: "Driver",
        email: `fleet-driver-${suffix}@test.local`,
        passwordHash: "hash",
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

    let vehicleId = "";
    let licenseId = "";
    let assignmentId = "";

    try {
      const createVehicle = await request(app).post("/api/v1/vehicles").set("Authorization", adminAuth).send({
        vehicleType: "TRUCK",
        plateNumber: `BG-${suffix}`,
        countryOfRegistration: "rs",
        brand: "MAN",
        model: "TGX",
        year: 2024,
        capacityKg: 12000,
        volumeM3: "42.5",
        bodyType: "BOX",
        imageUrl: "https://cdn.example.test/trucks/primary.png",
        documentsJson: {
          insurance: "https://cdn.example.test/trucks/insurance.pdf",
          yearlyInspection: "https://cdn.example.test/trucks/inspection.pdf",
        },
        refrigerated: false,
        hazmatCertified: true,
      });
      expect(createVehicle.statusCode).toBe(201);
      vehicleId = createVehicle.body.data.id as string;
      expect(createVehicle.body.data.countryOfRegistration).toBe("RS");
      expect(createVehicle.body.data.imageUrl).toBe("https://cdn.example.test/trucks/primary.png");
      expect(createVehicle.body.data.documentsJson).toMatchObject({
        insurance: "https://cdn.example.test/trucks/insurance.pdf",
        yearlyInspection: "https://cdn.example.test/trucks/inspection.pdf",
      });

      const driverVehicleList = await request(app).get("/api/v1/vehicles").set("Authorization", driverAuth);
      expect(driverVehicleList.statusCode).toBe(200);
      expect((driverVehicleList.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(vehicleId);

      const driverVehicleCreate = await request(app).post("/api/v1/vehicles").set("Authorization", driverAuth).send({
        vehicleType: "VAN",
        plateNumber: `DRV-${suffix}`,
        countryOfRegistration: "RS",
      });
      expect(driverVehicleCreate.statusCode).toBe(403);
      expect(driverVehicleCreate.body.error.code).toBe("FORBIDDEN");

      const updateVehicle = await request(app)
        .patch(`/api/v1/vehicles/${vehicleId}`)
        .set("Authorization", adminAuth)
        .send({ imageUrl: "https://cdn.example.test/trucks/updated.png", model: "TGX XL" });
      expect(updateVehicle.statusCode).toBe(200);
      expect(updateVehicle.body.data.model).toBe("TGX XL");
      expect(updateVehicle.body.data.imageUrl).toBe("https://cdn.example.test/trucks/updated.png");

      const driverVehicleUpdate = await request(app)
        .patch(`/api/v1/vehicles/${vehicleId}`)
        .set("Authorization", driverAuth)
        .send({ model: "Blocked" });
      expect(driverVehicleUpdate.statusCode).toBe(403);

      const deleteVehicle = await request(app).delete(`/api/v1/vehicles/${vehicleId}`).set("Authorization", adminAuth);
      expect(deleteVehicle.statusCode).toBe(200);
      const restoreVehicle = await request(app).post(`/api/v1/vehicles/${vehicleId}/restore`).set("Authorization", adminAuth).send({});
      expect(restoreVehicle.statusCode).toBe(200);

      const createLicense = await request(app).post("/api/v1/licenses").set("Authorization", adminAuth).send({
        userId: driver.id,
        licenseType: "ce",
        imageUrl: "https://cdn.example.test/licenses/front.jpg",
        documentUrl: "https://cdn.example.test/licenses/license.pdf",
        issuedAt: "2026-01-01",
        expiresAt: "2028-01-01",
      });
      expect(createLicense.statusCode).toBe(201);
      licenseId = createLicense.body.data.id as string;
      expect(createLicense.body.data.licenseType).toBe("CE");
      expect(createLicense.body.data.imageUrl).toBe("https://cdn.example.test/licenses/front.jpg");
      expect(createLicense.body.data.documentUrl).toBe("https://cdn.example.test/licenses/license.pdf");

      const licenseTypes = await request(app).get("/api/v1/licenses/types").set("Authorization", adminAuth);
      expect(licenseTypes.statusCode).toBe(200);
      expect((licenseTypes.body.data as Array<{ code: string }>).map((item) => item.code)).toContain("CE");

      const unsupportedLicense = await request(app).post("/api/v1/licenses").set("Authorization", adminAuth).send({
        userId: driver.id,
        licenseType: `CUSTOM-${suffix}`,
      });
      expect(unsupportedLicense.statusCode).toBe(400);
      expect(unsupportedLicense.body.error.code).toBe("VALIDATION_ERROR");

      const driverLicenseList = await request(app).get("/api/v1/licenses").set("Authorization", driverAuth);
      expect(driverLicenseList.statusCode).toBe(200);
      expect((driverLicenseList.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(licenseId);

      const driverLicenseCreate = await request(app).post("/api/v1/licenses").set("Authorization", driverAuth).send({
        licenseType: `SELF-${suffix}`,
      });
      expect(driverLicenseCreate.statusCode).toBe(403);
      expect(driverLicenseCreate.body.error.code).toBe("FORBIDDEN");

      const driverLicenseUpdate = await request(app)
        .patch(`/api/v1/licenses/${licenseId}`)
        .set("Authorization", driverAuth)
        .send({ isValid: false });
      expect(driverLicenseUpdate.statusCode).toBe(403);

      const deleteLicense = await request(app).delete(`/api/v1/licenses/${licenseId}`).set("Authorization", adminAuth);
      expect(deleteLicense.statusCode).toBe(200);
      const restoreLicense = await request(app).post(`/api/v1/licenses/${licenseId}/restore`).set("Authorization", adminAuth).send({});
      expect(restoreLicense.statusCode).toBe(200);

      const createAssignment = await request(app).post("/api/v1/vehicle-assignments").set("Authorization", adminAuth).send({
        vehicleId,
        driverUserId: driver.id,
        startsAt: "2026-02-01T08:00:00.000Z",
        endsAt: "2026-02-05T08:00:00.000Z",
      });
      expect(createAssignment.statusCode).toBe(201);
      assignmentId = createAssignment.body.data.id as string;

      const driverAssignmentList = await request(app).get("/api/v1/vehicle-assignments").set("Authorization", driverAuth);
      expect(driverAssignmentList.statusCode).toBe(200);
      expect((driverAssignmentList.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(assignmentId);

      const driverAssignmentCreate = await request(app).post("/api/v1/vehicle-assignments").set("Authorization", driverAuth).send({
        vehicleId,
        driverUserId: driver.id,
        startsAt: "2026-03-01T08:00:00.000Z",
      });
      expect(driverAssignmentCreate.statusCode).toBe(403);

      const overlapAssignment = await request(app).post("/api/v1/vehicle-assignments").set("Authorization", adminAuth).send({
        vehicleId,
        driverUserId: driver.id,
        startsAt: "2026-02-02T08:00:00.000Z",
        endsAt: "2026-02-03T08:00:00.000Z",
      });
      expect(overlapAssignment.statusCode).toBe(409);
      expect(overlapAssignment.body.error.code).toBe("DRIVER_ALREADY_ASSIGNED");

      const deleteAssignment = await request(app).delete(`/api/v1/vehicle-assignments/${assignmentId}`).set("Authorization", adminAuth);
      expect(deleteAssignment.statusCode).toBe(200);
      const restoreAssignment = await request(app)
        .post(`/api/v1/vehicle-assignments/${assignmentId}/restore`)
        .set("Authorization", adminAuth)
        .send({});
      expect(restoreAssignment.statusCode).toBe(200);
    } finally {
      await prisma.vehicleAssignment.deleteMany({ where: { OR: [{ id: assignmentId }, { driverUserId: driver.id }] } });
      await prisma.license.deleteMany({ where: { OR: [{ id: licenseId }, { userId: driver.id }] } });
      await prisma.vehicle.deleteMany({ where: { OR: [{ id: vehicleId }, { companyId: company.id }] } });
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, driver.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 30_000);
});
