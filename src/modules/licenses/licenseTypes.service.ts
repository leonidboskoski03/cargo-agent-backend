export const licenseTypes = [
  { code: "B", label: "B - Car / light vehicle" },
  { code: "C", label: "C - Rigid truck" },
  { code: "CE", label: "CE - Truck with trailer" },
  { code: "C1", label: "C1 - Medium goods vehicle" },
  { code: "C1E", label: "C1E - Medium goods with trailer" },
  { code: "ADR", label: "ADR - Dangerous goods" },
  { code: "FORKLIFT", label: "Forklift operator" },
  { code: "TACHOGRAPH", label: "Digital tachograph card" },
] as const;

export const licenseTypeCodes = licenseTypes.map((licenseType) => licenseType.code);

export function isSupportedLicenseType(value: string) {
  return licenseTypeCodes.includes(value as (typeof licenseTypeCodes)[number]);
}
