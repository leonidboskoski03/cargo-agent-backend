import request from "supertest";
import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("job application owner lifecycle", () => {
  it("lets owners update/delete/restore listings and blocks non-owners", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!(await isDatabaseAvailable(prisma))) return;

    const app = buildApp();
    const suffix = Date.now().toString();
    const owner = await prisma.user.create({
      data: {
        email: `job-owner-${suffix}@test.local`,
        firstName: "Job",
        lastName: "Owner",
        passwordHash: "hash",
        role: UserRole.JOB_SEEKER,
      },
    });
    const other = await prisma.user.create({
      data: {
        email: `job-other-${suffix}@test.local`,
        firstName: "Other",
        lastName: "Seeker",
        passwordHash: "hash",
        role: UserRole.JOB_SEEKER,
      },
    });
    const listing = await prisma.jobApplication.create({
      data: {
        createdByUserId: owner.id,
        title: `Owner listing ${suffix}`,
        status: "OPEN",
      },
    });

    try {
      const ownerAuth = authHeader(signAccessToken, {
        email: owner.email,
        role: owner.role,
        userId: owner.id,
      });
      const otherAuth = authHeader(signAccessToken, {
        email: other.email,
        role: other.role,
        userId: other.id,
      });

      const forbidden = await request(app)
        .patch(`/api/v1/job-applications/${listing.id}`)
        .set("Authorization", otherAuth)
        .send({ title: "Nope" });
      expect(forbidden.statusCode).toBe(404);

      const update = await request(app)
        .patch(`/api/v1/job-applications/${listing.id}`)
        .set("Authorization", ownerAuth)
        .send({ preferredCountryCode: "mk", preferredCity: "Prilep", status: "PAUSED", title: "Updated job listing" });
      expect(update.statusCode).toBe(200);
      expect(update.body.data.title).toBe("Updated job listing");
      expect(update.body.data.status).toBe("PAUSED");
      expect(update.body.data.preferredCountryCode).toBe("MK");

      const remove = await request(app).delete(`/api/v1/job-applications/${listing.id}`).set("Authorization", ownerAuth);
      expect(remove.statusCode).toBe(200);
      expect(remove.body.data.deletedAt).toBeTruthy();
      expect(remove.body.data.status).toBe("CLOSED");

      const restore = await request(app).post(`/api/v1/job-applications/${listing.id}/restore`).set("Authorization", ownerAuth).send({});
      expect(restore.statusCode).toBe(200);
      expect(restore.body.data.deletedAt).toBeNull();
      expect(restore.body.data.status).toBe("PAUSED");
    } finally {
      await prisma.jobApplication.deleteMany({ where: { id: listing.id } });
      await prisma.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
    }
  }, 30_000);
});
