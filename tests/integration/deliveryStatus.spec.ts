import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { hashPassword } from "../../src/shared/auth/password.js";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("delivery provider status", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("exposes the configured delivery mode for release evidence", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = Date.now().toString();
    const user = await prisma.user.create({
      data: {
        role: UserRole.COMPANY_ADMIN,
        firstName: "Delivery",
        lastName: "Admin",
        email: `delivery-${suffix}@test.local`,
        passwordHash: await hashPassword("StrongPass123!"),
      },
      select: { id: true, email: true, role: true },
    });

    try {
      const response = await request(app)
        .get("/api/v1/delivery/status")
        .set("Authorization", authHeader(signAccessToken, { userId: user.id, role: user.role, email: user.email }));

      expect(response.statusCode).toBe(200);
      expect(response.body.data.email.provider).toBe("simulated");
      expect(response.body.data.email.mode).toBe("simulated");
      expect(response.body.data.otp.previewEnabled).toBe(true);
      expect(response.body.data.invites.acceptUrlBase).toBeTypeOf("string");
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });
});
