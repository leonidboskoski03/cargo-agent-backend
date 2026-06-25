import type { CompanyVerificationStatus } from "./companyVerification.constants.js";

type CompanyVerificationTarget = {
  city: string;
  countryCode: string;
  name: string;
  registrationNumber: string;
  vatNumber: string | null;
};

export type CompanyVerificationResult = {
  details: Record<string, unknown>;
  failureReason: string | null;
  provider: string;
  status: CompanyVerificationStatus;
};

function hasUsableIdentifier(value: string | null | undefined) {
  return Boolean(value?.trim() && value.trim().length >= 3);
}

export async function verifyCompanyWithProvider(company: CompanyVerificationTarget): Promise<CompanyVerificationResult> {
  const hasRegistration = hasUsableIdentifier(company.registrationNumber);
  const hasLocation = company.countryCode.trim().length === 2 && hasUsableIdentifier(company.city);
  const vatProvided = Boolean(company.vatNumber?.trim());
  const vatLooksUsable = !vatProvided || hasUsableIdentifier(company.vatNumber);
  const verified = hasRegistration && hasLocation && vatLooksUsable;

  return {
    details: {
      simulated: true,
      checks: {
        registrationNumberPresent: hasRegistration,
        countryAndCityPresent: hasLocation,
        vatNumberUsable: vatLooksUsable,
      },
    },
    failureReason: verified ? null : "Company registration, location, or VAT fields are incomplete for simulated verification.",
    provider: "simulated_registry",
    status: verified ? "VERIFIED" : "NEEDS_REVIEW",
  };
}
