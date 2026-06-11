import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

function present(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function stripeKeyMode(key: string | undefined) {
  if (!present(key)) {
    return "missing";
  }

  if (key?.startsWith("sk_test_")) {
    return "test";
  }

  if (key?.startsWith("sk_live_")) {
    return "live";
  }

  return "unknown";
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    stripe: {
      secretKeyPresent: present(process.env.STRIPE_SECRET_KEY),
      secretKeyMode: stripeKeyMode(process.env.STRIPE_SECRET_KEY),
      webhookSecretPresent: present(process.env.STRIPE_WEBHOOK_SECRET),
      webhookSignatureMode: present(process.env.STRIPE_WEBHOOK_SECRET)
        ? "signature-verification"
        : "local-json-fallback",
      proMonthlyPriceIdPresent: present(process.env.STRIPE_PRO_MONTHLY_PRICE_ID),
      checkoutSuccessUrl: process.env.STRIPE_CHECKOUT_SUCCESS_URL ?? null,
      checkoutCancelUrl: process.env.STRIPE_CHECKOUT_CANCEL_URL ?? null,
      portalReturnUrl: process.env.BILLING_PORTAL_RETURN_URL ?? null,
    },
    database: {
      connected: false,
      plans: [] as Array<{ code: string; stripePriceIdPresent: boolean }>,
      jobSeekerCreditPacks: [] as Array<{ code: string; stripePriceIdPresent: boolean }>,
      companyCreditPacks: [] as Array<{ code: string; stripePriceIdPresent: boolean }>,
      error: null as string | null,
    },
    automatedEvidence: {
      webhookReplayCommand: "npm run test:evidence:webhooks",
      releaseCommand: "npm run test:release:ci",
      notes: [
        "Automated tests prove local idempotency only.",
        "Release proof still needs retained Stripe test event IDs and replay output.",
      ],
    },
    manualEvidenceStillRequired: [
      "Stripe CLI listener output including whsec_... secret",
      "Test checkout session IDs and Stripe event IDs",
      "Replay proof showing duplicate events do not duplicate credits or subscriptions",
      "Worker startup logs when BULLMQ_ENABLED=true",
    ],
  };

  try {
    const [plans, jobSeekerCreditPacks, companyCreditPacks] = await Promise.all([
      prisma.plan.findMany({ select: { code: true, stripePriceId: true }, orderBy: { code: "asc" } }),
      prisma.jobSeekerCreditPack.findMany({ select: { code: true, stripePriceId: true }, orderBy: { code: "asc" } }),
      prisma.companyCreditPack.findMany({ select: { code: true, stripePriceId: true }, orderBy: { code: "asc" } }),
    ]);

    report.database.connected = true;
    report.database.plans = plans.map((plan) => ({
      code: plan.code,
      stripePriceIdPresent: present(plan.stripePriceId ?? undefined),
    }));
    report.database.jobSeekerCreditPacks = jobSeekerCreditPacks.map((pack) => ({
      code: pack.code,
      stripePriceIdPresent: present(pack.stripePriceId ?? undefined),
    }));
    report.database.companyCreditPacks = companyCreditPacks.map((pack) => ({
      code: pack.code,
      stripePriceIdPresent: present(pack.stripePriceId ?? undefined),
    }));
  } catch (error) {
    report.database.error = error instanceof Error ? error.message : "Unknown database error";
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.stripe.secretKeyMode === "live") {
    console.error("Live Stripe key detected. Use test-mode keys for sandbox verification.");
    process.exitCode = 1;
  }
}

void main();
