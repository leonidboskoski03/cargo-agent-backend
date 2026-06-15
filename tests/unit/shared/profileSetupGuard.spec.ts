import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyType, UserRole } from "@prisma/client";
import {
  assertCompanyMarketplaceSetupComplete,
  assertVehicleListingPublishSetupComplete,
} from "../../../src/shared/profileSetup/profileSetupGuard.js";
import { prisma } from "../../../src/shared/prisma/prismaClient.js";

describe("profile setup marketplace guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks company marketplace actions when company basics are missing", async () => {
    vi.spyOn(prisma.company, "findUnique").mockResolvedValue({
      city: "",
      companyType: null,
      countryCode: "MK",
      name: "Carrier One",
      registrationNumber: "",
    } as never);

    await expect(
      assertCompanyMarketplaceSetupComplete(
        { companyId: "company_1", role: UserRole.COMPANY_ADMIN, userId: "admin_1" },
        "CREATE_TRANSPORT_POST",
      ),
    ).rejects.toMatchObject({
      code: "PROFILE_SETUP_REQUIRED",
      statusCode: 403,
      details: {
        action: "CREATE_TRANSPORT_POST",
        missingItems: ["companyType", "registrationNumber", "companyCity"],
        onboardingUrl: "/onboarding",
      },
    });
  });

  it("allows company marketplace actions when company basics are complete", async () => {
    vi.spyOn(prisma.company, "findUnique").mockResolvedValue({
      city: "Skopje",
      companyType: CompanyType.CARRIER,
      countryCode: "MK",
      name: "Carrier One",
      registrationNumber: "REG-1",
    } as never);

    await expect(
      assertCompanyMarketplaceSetupComplete(
        { companyId: "company_1", role: UserRole.COMPANY_ADMIN, userId: "admin_1" },
        "SUBMIT_BID",
      ),
    ).resolves.toBeUndefined();
  });

  it("blocks job seeker vehicle listing publish until phone, country, and city are present", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      city: null,
      countryCode: "MK",
      phone: "",
    } as never);

    await expect(
      assertVehicleListingPublishSetupComplete({ role: UserRole.JOB_SEEKER, userId: "seeker_1" }),
    ).rejects.toMatchObject({
      code: "PROFILE_SETUP_REQUIRED",
      statusCode: 403,
      details: {
        action: "PUBLISH_VEHICLE_LISTING",
        missingItems: ["phone", "city"],
        onboardingUrl: "/onboarding",
      },
    });
  });
});
