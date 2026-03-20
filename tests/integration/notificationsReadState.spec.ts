import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { CompanyType, NotificationType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("notifications read state", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("lists notifications and marks single/all as read", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = Date.now().toString();

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Notify Co ${suffix}`,
        registrationNumber: `NOT-${suffix}`,
        countryCode: "DE",
        city: "Berlin",
      },
    });

    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        role: UserRole.COMPANY_ADMIN,
        firstName: "N",
        lastName: "Admin",
        email: `notify-admin-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const token = authHeader(signAccessToken, {
      userId: admin.id,
      role: admin.role,
      companyId: company.id,
      email: admin.email,
    });

    const n1 = await prisma.notification.create({
      data: {
        type: NotificationType.CONTRACT_CREATED,
        recipientCompanyId: company.id,
        title: "Contract created",
        body: "A contract has been created.",
      },
    });

    const n2 = await prisma.notification.create({
      data: {
        type: NotificationType.BID_ACCEPTED,
        recipientCompanyId: company.id,
        title: "Bid accepted",
        body: "Your bid is accepted.",
      },
    });

    try {
      const listResponse = await request(app).get("/api/v1/notifications").set("Authorization", token);
      expect(listResponse.statusCode).toBe(200);
      expect(Array.isArray(listResponse.body.data)).toBe(true);

      const markOne = await request(app)
        .patch(`/api/v1/notifications/${n1.id}/read`)
        .set("Authorization", token)
        .send({});
      expect(markOne.statusCode).toBe(200);
      expect(markOne.body.data.readAt).toBeTruthy();

      const markAll = await request(app).patch("/api/v1/notifications/read-all").set("Authorization", token).send({});
      expect(markAll.statusCode).toBe(200);
      expect(markAll.body.data.count).toBeGreaterThanOrEqual(1);

      const unreadResponse = await request(app)
        .get("/api/v1/notifications")
        .query({ unreadOnly: true })
        .set("Authorization", token);
      expect(unreadResponse.statusCode).toBe(200);
      expect(unreadResponse.body.data.length).toBe(0);
    } finally {
      await prisma.notification.deleteMany({ where: { id: { in: [n1.id, n2.id] } } });
      await prisma.user.deleteMany({ where: { id: admin.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 20_000);
});

