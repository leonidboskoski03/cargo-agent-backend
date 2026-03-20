import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("job applications scenario", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("supports job seeker listing and company submission", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Apply Co ${suffix}`,
        registrationNumber: `APL-${suffix}`,
        countryCode: "PL",
        city: "Lodz",
      },
    });

    const companyAdmin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "Comp",
        lastName: "Admin",
        email: `apply-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const jobSeeker = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Job",
        lastName: "Seeker",
        email: `seeker-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const companyToken = authHeader(signAccessToken, {
      userId: companyAdmin.id,
      role: companyAdmin.role,
      companyId: company.id,
      email: companyAdmin.email,
    });

    const seekerToken = authHeader(signAccessToken, {
      userId: jobSeeker.id,
      role: jobSeeker.role,
      email: jobSeeker.email,
    });

    try {
      const createResponse = await request(app)
        .post("/api/v1/job-applications")
        .set("Authorization", seekerToken)
        .send({
          title: "Experienced driver",
          preferredCountryCode: "PL",
        });
      expect(createResponse.statusCode).toBe(201);
      const jobApplicationId = createResponse.body.data.id as string;

      const applyResponse = await request(app)
        .post(`/api/v1/job-applications/${jobApplicationId}/apply`)
        .set("Authorization", companyToken)
        .send({ message: "We are interested." });
      expect(applyResponse.statusCode).toBe(201);

      const ownApplyResponse = await request(app)
        .post(`/api/v1/job-applications/${jobApplicationId}/apply`)
        .set("Authorization", seekerToken)
        .send({ message: "self apply" });
      expect(ownApplyResponse.statusCode).toBe(400);
      expect(ownApplyResponse.body.error.code).toBe("CANNOT_APPLY_TO_OWN_LISTING");

      const submissionsResponse = await request(app)
        .get(`/api/v1/job-applications/${jobApplicationId}/submissions`)
        .set("Authorization", seekerToken);
      expect(submissionsResponse.statusCode).toBe(200);
      expect(submissionsResponse.body.data.length).toBe(1);
    } finally {
      await prisma.jobApplicationSubmission.deleteMany({
        where: {
          submittedByUserId: companyAdmin.id,
        },
      });
      await prisma.jobApplication.deleteMany({ where: { createdByUserId: jobSeeker.id } });
      await prisma.user.deleteMany({ where: { id: { in: [companyAdmin.id, jobSeeker.id] } } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);
});

