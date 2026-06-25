import { describe, expect, it } from "vitest";
import { verifyCompanyWithProvider } from "../../../../src/modules/companies/companyVerification.provider.js";

describe("company verification provider", () => {
  it("marks complete identity fields as verified with simulated provider details", async () => {
    const result = await verifyCompanyWithProvider({
      city: "Skopje",
      countryCode: "MK",
      name: "Carrier One",
      registrationNumber: "REG-1",
      vatNumber: "VAT-1",
    });

    expect(result).toMatchObject({
      failureReason: null,
      provider: "simulated_registry",
      status: "VERIFIED",
    });
    expect(result.details).toMatchObject({ simulated: true });
  });

  it("marks incomplete identity fields as needing review", async () => {
    const result = await verifyCompanyWithProvider({
      city: "",
      countryCode: "MK",
      name: "Carrier One",
      registrationNumber: "",
      vatNumber: null,
    });

    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.failureReason).toContain("incomplete");
  });
});
