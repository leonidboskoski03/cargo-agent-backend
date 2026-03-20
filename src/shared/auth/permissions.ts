export const Roles = {
  COMPANY_ADMIN: "COMPANY_ADMIN",
  COMPANY_DRIVER: "COMPANY_DRIVER",
  JOB_SEEKER: "JOB_SEEKER",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const COMPANY_ROLES: Role[] = [Roles.COMPANY_ADMIN, Roles.COMPANY_DRIVER];

export function isCompanyRole(role?: string | null): role is Role {
  return Boolean(role && COMPANY_ROLES.includes(role as Role));
}

export function isJobSeekerRole(role?: string | null): role is Role {
  return role === Roles.JOB_SEEKER;
}

