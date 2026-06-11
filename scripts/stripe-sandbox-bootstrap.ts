import { PlanCode, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const prisma = new PrismaClient();

type PriceSpec = {
  amountCents: number;
  currency: string;
  lookupKey: string;
  name: string;
  recurring?: "month";
};

const specs = {
  pro: {
    amountCents: 4900,
    currency: "eur",
    lookupKey: "cargo_agent_pro_monthly",
    name: "Cargo Agent PRO",
    recurring: "month" as const,
  },
  jobSeekerPacks: [
    { code: "JS_CREDITS_10", name: "Job Seeker Credits 10", amountCents: 499, currency: "eur", lookupKey: "js_credits_10" },
    { code: "JS_CREDITS_30", name: "Job Seeker Credits 30", amountCents: 1299, currency: "eur", lookupKey: "js_credits_30" },
    { code: "JS_CREDITS_70", name: "Job Seeker Credits 70", amountCents: 2499, currency: "eur", lookupKey: "js_credits_70" },
  ],
  companyPacks: [
    { code: "CO_CREDITS_10", name: "Company Credits 10", amountCents: 499, currency: "eur", lookupKey: "co_credits_10" },
    { code: "CO_CREDITS_30", name: "Company Credits 30", amountCents: 1299, currency: "eur", lookupKey: "co_credits_30" },
    { code: "CO_CREDITS_70", name: "Company Credits 70", amountCents: 2499, currency: "eur", lookupKey: "co_credits_70" },
  ],
};

function requireTestKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  if (!key.startsWith("sk_test_")) {
    throw new Error("Refusing to bootstrap sandbox with a non-test Stripe key");
  }

  return key;
}

async function ensurePrice(stripe: Stripe, spec: PriceSpec) {
  const existing = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
    limit: 1,
    lookup_keys: [spec.lookupKey],
  });

  if (existing.data[0]) {
    return existing.data[0];
  }

  const product = await stripe.products.create({
    metadata: { app: "cargo-agent", sandbox: "true" },
    name: spec.name,
  });

  return stripe.prices.create({
    currency: spec.currency,
    lookup_key: spec.lookupKey,
    product: product.id,
    recurring: spec.recurring ? { interval: spec.recurring } : undefined,
    unit_amount: spec.amountCents,
  });
}

async function main() {
  const stripe = new Stripe(requireTestKey(), { apiVersion: "2025-08-27.basil" });

  const proPrice = await ensurePrice(stripe, specs.pro);
  await prisma.plan.update({
    data: {
      stripePriceId: proPrice.id,
      stripeProductId: typeof proPrice.product === "string" ? proPrice.product : proPrice.product.id,
    },
    where: { code: PlanCode.PRO },
  });

  for (const pack of specs.jobSeekerPacks) {
    const price = await ensurePrice(stripe, pack);
    await prisma.jobSeekerCreditPack.update({
      data: { stripePriceId: price.id },
      where: { code: pack.code },
    });
  }

  for (const pack of specs.companyPacks) {
    const price = await ensurePrice(stripe, pack);
    await prisma.companyCreditPack.update({
      data: { stripePriceId: price.id },
      where: { code: pack.code },
    });
  }

  await prisma.$disconnect();

  console.log(
    JSON.stringify(
      {
        companyCreditPacks: specs.companyPacks.map((pack) => pack.code),
        jobSeekerCreditPacks: specs.jobSeekerPacks.map((pack) => pack.code),
        message: "Stripe sandbox products/prices are ready and DB price IDs were updated.",
        proPriceId: proPrice.id,
      },
      null,
      2,
    ),
  );
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
