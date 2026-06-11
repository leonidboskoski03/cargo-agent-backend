import { env } from "./env.js";

export const companyCreditsConfig = {
  freeJobPostsPerMonth: env.COMPANY_JOB_POSTS_FREE_MONTHLY,
  freeVehicleListingsPerMonth: env.COMPANY_VEHICLE_LISTINGS_FREE_MONTHLY,
  jobPostCreditCost: env.COMPANY_JOB_POST_CREDIT_COST,
  marketplaceBoostDurationDays: env.MARKETPLACE_BOOST_DURATION_DAYS,
  postBoostCreditCost: env.COMPANY_POST_BOOST_CREDIT_COST,
  transportPostCreditCost: env.COMPANY_TRANSPORT_POST_CREDIT_COST,
  vehicleListingCreditCost: env.COMPANY_VEHICLE_LISTING_CREDIT_COST,
};
