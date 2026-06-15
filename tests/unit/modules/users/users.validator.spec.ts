import { describe, expect, it } from "vitest";
import { updateMyProfileSchema } from "../../../../src/modules/users/users.validator.js";

describe("users validator", () => {
  it("accepts and normalizes supported preferred language codes", () => {
    const result = updateMyProfileSchema.parse({
      body: { preferredLanguage: "MK" },
      params: {},
      query: {},
    });

    expect(result.body.preferredLanguage).toBe("mk");
  });

  it("rejects unsupported preferred language codes", () => {
    expect(() =>
      updateMyProfileSchema.parse({
        body: { preferredLanguage: "xx" },
        params: {},
        query: {},
      }),
    ).toThrow(/Unsupported language/);
  });
});
