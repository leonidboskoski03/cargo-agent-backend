import { env } from "./env.js";

export const jobSeekerBillingConfig = {
  freeApplicationsPerMonth: env.JOB_SEEKER_FREE_APPLICATIONS_PER_MONTH,
  freeActiveListings: env.JOB_SEEKER_FREE_ACTIVE_LISTINGS,
  freeVehicleListingsPerMonth: env.JOB_SEEKER_FREE_VEHICLE_LISTINGS_PER_MONTH,
  applicationCreditCost: env.JOB_SEEKER_APPLICATION_CREDIT_COST,
  listingPublishCreditCost: env.JOB_SEEKER_LISTING_PUBLISH_CREDIT_COST,
  vehicleListingCreditCost: env.JOB_SEEKER_VEHICLE_LISTING_CREDIT_COST,
  listingPromotionCreditCost: env.JOB_SEEKER_LISTING_PROMOTION_CREDIT_COST,
  submissionPromotionCreditCost: env.JOB_SEEKER_SUBMISSION_PROMOTION_CREDIT_COST,
};

