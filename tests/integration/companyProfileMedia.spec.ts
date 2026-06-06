import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("company profile media", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  }, 20_000);

  it("accepts a data image logo while updating company profile fields", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = `${Date.now()}-company-media`;

    const company = await prisma.company.create({
      data: {
        city: "Prilep",
        companyType: CompanyType.BOTH,
        countryCode: "MK",
        name: `Media Company ${suffix}`,
        registrationNumber: `MEDIA-${suffix}`,
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `media-admin-${suffix}@test.local`,
        firstName: "Media",
        lastName: "Admin",
        passwordHash: "hash",
        role: UserRole.COMPANY_ADMIN,
      },
    });

    const adminAuth = authHeader(signAccessToken, {
      companyId: company.id,
      email: admin.email,
      role: admin.role,
      userId: admin.id,
    });

    const logoUrl = `data:image/png;base64,${"a".repeat(140_000)}`;

    try {
      const response = await request(app).patch("/api/v1/companies/me").set("Authorization", adminAuth).send({
        address: "ul. Prilep Siti",
        bio: "Local carrier profile.",
        city: "Prilep",
        companyType: "SHIPPER",
        countryCode: "MK",
        email: "test@test.com",
        employeeCount: 5,
        logoUrl,
        name: "Leonid Kompani",
        phone: "123321321",
        registrationNumber: "191919",
        vatNumber: "191919",
        website: "https://test.com",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.logoUrl).toBe(logoUrl);
      expect(response.body.data.companyType).toBe("SHIPPER");
      expect(response.body.data.employeeCount).toBe(5);
    } finally {
      await prisma.user.deleteMany({ where: { id: admin.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  });
});
