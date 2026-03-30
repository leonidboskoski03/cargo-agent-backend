import { env } from "./env.js";

export const jobSeekerBillingConfig = {
  freeApplicationsPerMonth: env.JOB_SEEKER_FREE_APPLICATIONS_PER_MONTH,
  freeActiveListings: env.JOB_SEEKER_FREE_ACTIVE_LISTINGS,
  applicationCreditCost: env.JOB_SEEKER_APPLICATION_CREDIT_COST,
  listingPromotionCreditCost: env.JOB_SEEKER_LISTING_PROMOTION_CREDIT_COST,
  submissionPromotionCreditCost: env.JOB_SEEKER_SUBMISSION_PROMOTION_CREDIT_COST,
};

