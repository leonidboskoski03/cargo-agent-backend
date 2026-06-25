export const companyVerificationStatuses = ["UNVERIFIED", "PENDING", "VERIFIED", "FAILED", "NEEDS_REVIEW"] as const;

export type CompanyVerificationStatus = (typeof companyVerificationStatuses)[number];
