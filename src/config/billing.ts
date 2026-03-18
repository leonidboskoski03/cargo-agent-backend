import { env } from "./env.js";

export const billingConfig = {
  checkoutSuccessUrl: env.STRIPE_CHECKOUT_SUCCESS_URL,
  checkoutCancelUrl: env.STRIPE_CHECKOUT_CANCEL_URL,
  portalReturnUrl: env.BILLING_PORTAL_RETURN_URL,
  proMonthlyPriceId: env.STRIPE_PRO_MONTHLY_PRICE_ID,
};

