import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CompanyType, UserRole } from "@prisma/client";
import { authHeader, initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("geo catalog and company-private routes", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("returns backend-managed languages and geo city suggestions", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = `${Date.now()}-geo`;
    await prisma.supportedCountry.upsert({
      where: { code: "MK" },
      update: { isActive: true, name: "North Macedonia" },
      create: { code: "MK", isActive: true, name: "North Macedonia" },
    });
    await prisma.supportedCity.create({
      data: {
        countryCode: "MK",
        name: `Skopje ${suffix}`,
        region: "Skopje",
        lat: 41.9973,
        lng: 21.428,
      },
    });

    const languages = await request(app).get("/api/v1/localization/languages");
    expect(languages.statusCode).toBe(200);
    expect(languages.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ code: "en" }), expect.objectContaining({ code: "mk" })]));

    const countries = await request(app).get("/api/v1/geo/countries");
    expect(countries.statusCode).toBe(200);
    expect(countries.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MK" })]));

    const cities = await request(app).get("/api/v1/geo/cities").query({ countryCode: "MK", q: suffix, pageSize: 5 });
    expect(cities.statusCode).toBe(200);
    expect(cities.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ name: `Skopje ${suffix}`, countryCode: "MK" })]));
  });

  it("scopes routes and route-backed posts to the authenticated company", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = `${Date.now()}-route-privacy`;
    const [companyA, companyB] = await Promise.all([
      prisma.company.create({
        data: {
          city: "Skopje",
          companyType: CompanyType.CARRIER,
          countryCode: "MK",
          name: `Route A ${suffix}`,
          registrationNumber: `ROUTE-A-${suffix}`,
        },
      }),
      prisma.company.create({
        data: {
          city: "Bitola",
          companyType: CompanyType.CARRIER,
          countryCode: "MK",
          name: `Route B ${suffix}`,
          registrationNumber: `ROUTE-B-${suffix}`,
        },
      }),
    ]);
    const [adminA, adminB] = await Promise.all([
      prisma.user.create({
        data: {
          companyId: companyA.id,
          email: `route-a-${suffix}@test.local`,
          firstName: "Route",
          lastName: "AdminA",
          passwordHash: "hash",
          role: UserRole.COMPANY_ADMIN,
        },
      }),
      prisma.user.create({
        data: {
          companyId: companyB.id,
          email: `route-b-${suffix}@test.local`,
          firstName: "Route",
          lastName: "AdminB",
          passwordHash: "hash",
          role: UserRole.COMPANY_ADMIN,
        },
      }),
    ]);
    const [origin, destination] = await Promise.all([
      prisma.location.create({ data: { city: `Origin ${suffix}`, countryCode: "MK", lat: 41.9973, lng: 21.428 } }),
      prisma.location.create({ data: { city: `Destination ${suffix}`, countryCode: "MK", lat: 41.0319, lng: 21.3347 } }),
    ]);

    const tokenA = authHeader(signAccessToken, { companyId: companyA.id, email: adminA.email, role: adminA.role, userId: adminA.id });
    const tokenB = authHeader(signAccessToken, { companyId: companyB.id, email: adminB.email, role: adminB.role, userId: adminB.id });

    const created = await request(app)
      .post("/api/v1/routes")
      .set("Authorization", tokenA)
      .send({ destinationLocationId: destination.id, distanceKm: 10, originLocationId: origin.id });
    expect(created.statusCode).toBe(201);
    expect(created.body.data.companyId).toBe(companyA.id);

    const companyAList = await request(app).get("/api/v1/routes").set("Authorization", tokenA);
    expect(companyAList.statusCode).toBe(200);
    expect(companyAList.body.data.map((route: { id: string }) => route.id)).toContain(created.body.data.id);

    const companyBList = await request(app).get("/api/v1/routes").set("Authorization", tokenB);
    expect(companyBList.statusCode).toBe(200);
    expect(companyBList.body.data.map((route: { id: string }) => route.id)).not.toContain(created.body.data.id);

    const companyBDetail = await request(app).get(`/api/v1/routes/${created.body.data.id}`).set("Authorization", tokenB);
    expect(companyBDetail.statusCode).toBe(404);

    const companyBPost = await request(app)
      .post("/api/v1/posts")
      .set("Authorization", tokenB)
      .send({ currency: "EUR", priceType: "REQUEST_QUOTE", routeId: created.body.data.id, title: `Cross tenant ${suffix}` });
    expect(companyBPost.statusCode).toBe(404);
    expect(companyBPost.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("returns traceable route estimate errors and stores provider estimates when configured", async () => {
    const { prisma, buildApp, signAccessToken } = await initRuntime();
    if (!dbReady) return;

    const app = buildApp();
    const suffix = `${Date.now()}-estimate`;
    const company = await prisma.company.create({
      data: {
        city: "Skopje",
        companyType: CompanyType.CARRIER,
        countryCode: "MK",
        name: `Estimate ${suffix}`,
        registrationNumber: `ESTIMATE-${suffix}`,
      },
    });
    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `estimate-${suffix}@test.local`,
        firstName: "Estimate",
        lastName: "Admin",
        passwordHash: "hash",
        role: UserRole.COMPANY_ADMIN,
      },
    });
    const [origin, destination] = await Promise.all([
      prisma.location.create({ data: { city: `Estimate Origin ${suffix}`, countryCode: "MK", lat: 41.9973, lng: 21.428 } }),
      prisma.location.create({ data: { city: `Estimate Destination ${suffix}`, countryCode: "MK", lat: 41.0319, lng: 21.3347 } }),
    ]);
    const token = authHeader(signAccessToken, { companyId: company.id, email: admin.email, role: admin.role, userId: admin.id });
    const previousKey = process.env.OPENROUTESERVICE_API_KEY;
    const previousFetch = globalThis.fetch;

    process.env.OPENROUTESERVICE_API_KEY = "";
    const unconfigured = await request(app)
      .post("/api/v1/routes/estimate")
      .set("Authorization", token)
      .send({ destinationLocationId: destination.id, originLocationId: origin.id, vehicleProfile: "TRUCK" });
    expect(unconfigured.statusCode).toBe(503);
    expect(unconfigured.body.error.code).toBe("ROUTE_ESTIMATE_PROVIDER_NOT_CONFIGURED");
    expect(unconfigured.body.meta.traceId).toBeTruthy();

    process.env.OPENROUTESERVICE_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ routes: [{ summary: { distance: 61.2, duration: 5520 } }] }),
      ok: true,
    } as Response);

    const estimated = await request(app)
      .post("/api/v1/routes/estimate")
      .set("Authorization", token)
      .send({ destinationLocationId: destination.id, originLocationId: origin.id, vehicleProfile: "TRUCK" });
    expect(estimated.statusCode).toBe(200);
    expect(estimated.body.data).toMatchObject({
      distanceKm: 61,
      estimatedDurationMinutes: 92,
      profile: "driving-hgv",
      provider: "OPENROUTESERVICE",
    });

    globalThis.fetch = previousFetch;
    process.env.OPENROUTESERVICE_API_KEY = previousKey;
  });
});
