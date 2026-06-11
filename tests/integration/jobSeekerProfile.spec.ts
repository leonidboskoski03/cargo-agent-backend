import request from "supertest";
import { describe, expect, it } from "vitest";
import { CompanyType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("job seeker profile endpoints", () => {
  it("allows job seekers to update independent profile fields and blocks company users from those fields", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!(await isDatabaseAvailable(prisma))) return;

    const app = buildApp();
    const suffix = Date.now().toString();
    const jobSeeker = await prisma.user.create({
      data: {
        email: `profile-seeker-${suffix}@test.local`,
        firstName: "Profile",
        lastName: "Seeker",
        passwordHash: "hash",
        role: UserRole.JOB_SEEKER,
      },
    });
    const company = await prisma.company.create({
      data: {
        city: "Skopje",
        companyType: CompanyType.CARRIER,
        countryCode: "MK",
        name: `Profile Carrier ${suffix}`,
        registrationNumber: `PROFILE-${suffix}`,
      },
    });
    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `profile-admin-${suffix}@test.local`,
        firstName: "Company",
        lastName: "Admin",
        passwordHash: "hash",
        role: UserRole.COMPANY_ADMIN,
      },
    });

    try {
      const jobSeekerAuth = authHeader(signAccessToken, {
        email: jobSeeker.email,
        role: jobSeeker.role,
        userId: jobSeeker.id,
      });
      const adminAuth = authHeader(signAccessToken, {
        companyId: company.id,
        email: admin.email,
        role: admin.role,
        userId: admin.id,
      });

      const update = await request(app).patch("/api/v1/users/me").set("Authorization", jobSeekerAuth).send({
        availability: "Available from July",
        city: "Prilep",
        countryCode: "mk",
        headline: "ADR driver for Balkan routes",
        imageUrl: "https://example.com/profile.jpg",
        preferredRoutes: ["MK-BG", "MK-RS"],
        yearsExperience: 6,
      });

      expect(update.statusCode).toBe(200);
      expect(update.body.data.countryCode).toBe("MK");
      expect(update.body.data.headline).toBe("ADR driver for Balkan routes");
      expect(update.body.data.imageUrl).toBe("https://example.com/profile.jpg");
      expect(update.body.data.preferredRoutes).toEqual(["MK-BG", "MK-RS"]);

      const forbidden = await request(app).patch("/api/v1/users/me").set("Authorization", adminAuth).send({
        headline: "Not a job seeker field for admins",
      });

      expect(forbidden.statusCode).toBe(403);
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: [jobSeeker.id, admin.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 30_000);
});
