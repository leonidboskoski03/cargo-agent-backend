import type { UserRole } from "@prisma/client";
import { Roles } from "../auth/permissions.js";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../prisma/prismaClient.js";

type RequiredAuthContext = {
  userId: string;
  role: UserRole;
  companyId?: string | null;
};

type SetupAction =
  | "CREATE_TRANSPORT_POST"
  | "SUBMIT_BID"
  | "CREATE_CONTRACT"
  | "PUBLISH_VEHICLE_LISTING";

const companyRequiredFields = [
  "companyName",
  "companyType",
  "registrationNumber",
  "companyCountryCode",
  "companyCity",
] as const;

const jobSeekerVehicleListingFields = ["phone", "countryCode", "city"] as const;

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function setupError(action: SetupAction, missingItems: readonly string[]) {
  return new AppError(403, "PROFILE_SETUP_REQUIRED", "Complete account setup before using this marketplace action", {
    action,
    missingItems,
    onboardingUrl: "/onboarding",
  });
}

export async function assertCompanyMarketplaceSetupComplete(auth: RequiredAuthContext, action: SetupAction) {
  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
  }

  const company = await prisma.company.findUnique({
    select: {
      city: true,
      companyType: true,
      countryCode: true,
      name: true,
      registrationNumber: true,
    },
    where: { id: auth.companyId },
  });

  if (!company) {
    throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
  }

  const missingItems: string[] = [];
  if (!hasText(company.name)) missingItems.push("companyName");
  if (!company.companyType) missingItems.push("companyType");
  if (!hasText(company.registrationNumber)) missingItems.push("registrationNumber");
  if (!hasText(company.countryCode)) missingItems.push("companyCountryCode");
  if (!hasText(company.city)) missingItems.push("companyCity");

  if (missingItems.length > 0) {
    throw setupError(action, missingItems);
  }
}

export async function assertVehicleListingPublishSetupComplete(auth: RequiredAuthContext) {
  if (auth.role === Roles.COMPANY_ADMIN) {
    await assertCompanyMarketplaceSetupComplete(auth, "PUBLISH_VEHICLE_LISTING");
    return;
  }

  if (auth.role !== Roles.JOB_SEEKER) {
    throw new AppError(403, "FORBIDDEN", "Role is not allowed to publish vehicle marketplace listings");
  }

  const user = await prisma.user.findUnique({
    select: {
      city: true,
      countryCode: true,
      phone: true,
    },
    where: { id: auth.userId },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const missingItems: string[] = [];
  if (!hasText(user.phone)) missingItems.push("phone");
  if (!hasText(user.countryCode)) missingItems.push("countryCode");
  if (!hasText(user.city)) missingItems.push("city");

  if (missingItems.length > 0) {
    throw setupError("PUBLISH_VEHICLE_LISTING", missingItems);
  }
}

export const profileSetupRequirements = {
  companyMarketplace: companyRequiredFields,
  jobSeekerVehicleListing: jobSeekerVehicleListingFields,
};
