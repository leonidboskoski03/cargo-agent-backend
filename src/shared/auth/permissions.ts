export const Roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  COMPANY_ADMIN: "COMPANY_ADMIN",
  DISPATCHER: "DISPATCHER",
  DRIVER: "DRIVER",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

