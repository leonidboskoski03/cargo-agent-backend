import { env } from "./env.js";

export const billingConfig = {
  checkoutSuccessUrl: env.STRIPE_CHECKOUT_SUCCESS_URL,
  checkoutCancelUrl: env.STRIPE_CHECKOUT_CANCEL_URL,
  companyCreditsCancelUrl: env.STRIPE_COMPANY_CREDITS_CANCEL_URL,
  companyCreditsSuccessUrl: env.STRIPE_COMPANY_CREDITS_SUCCESS_URL,
  jobWalletCancelUrl: env.STRIPE_JOB_WALLET_CANCEL_URL,
  jobWalletSuccessUrl: env.STRIPE_JOB_WALLET_SUCCESS_URL,
  portalReturnUrl: env.BILLING_PORTAL_RETURN_URL,
  proMonthlyPriceId: env.STRIPE_PRO_MONTHLY_PRICE_ID,
};

