import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const freePlan = await prisma.plan.upsert({
    where: { code: "FREE" },
    update: {
      name: "Free",
      isActive: true,
      maxActivePosts: 5,
      maxBidsPerMonth: 25,
      maxTeamMembers: 3,
    },
    create: {
      code: "FREE",
      name: "Free",
      priceAmount: 0,
      currency: "EUR",
      isActive: true,
      maxActivePosts: 5,
      maxBidsPerMonth: 25,
      maxTeamMembers: 3,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {
      name: "Pro",
      billingInterval: "MONTHLY",
      currency: "EUR",
      isActive: true,
      maxActivePosts: 10,
      maxBidsPerMonth: 10,
      maxTeamMembers: 25,
      hasPromotedPosts: true,
      hasAnalytics: true,
      hasRouteAlerts: true,
    },
    create: {
      code: "PRO",
      name: "Pro",
      billingInterval: "MONTHLY",
      priceAmount: 49,
      currency: "EUR",
      isActive: true,
      maxActivePosts: 10,
      maxBidsPerMonth: 10,
      maxTeamMembers: 25,
      hasPromotedPosts: true,
      hasAnalytics: true,
      hasRouteAlerts: true,
    },
  });

  await prisma.company.upsert({
    where: { id: "seed-company" },
    update: {
      companyType: "CARRIER",
      registrationNumber: "MK-SEED-001",
      countryCode: "MK",
      city: "Skopje",
      email: "contact@seedlogistics.test",
      currentPlanId: freePlan.id,
      subscriptionStatus: "FREE",
    },
    create: {
      id: "seed-company",
      companyType: "CARRIER",
      name: "Seed Logistics",
      registrationNumber: "MK-SEED-001",
      countryCode: "MK",
      city: "Skopje",
      email: "contact@seedlogistics.test",
      currentPlanId: freePlan.id,
      subscriptionStatus: "FREE",
    },
  });

  await prisma.company.upsert({
    where: { id: "seed-company-pro" },
    update: {
      companyType: "BOTH",
      registrationNumber: "MK-SEED-002",
      countryCode: "MK",
      city: "Skopje",
      email: "both@seed.io",
      currentPlanId: proPlan.id,
      subscriptionStatus: "ACTIVE",
    },
    create: {
      id: "seed-company-pro",
      companyType: "BOTH",
      name: "BOTH Logistics",
      registrationNumber: "MK-SEED-002",
      countryCode: "MK",
      city: "Skopje",
      email: "both@seed.io",
      currentPlanId: proPlan.id,
      subscriptionStatus: "ACTIVE",
    }
  })

  await prisma.jobSeekerCreditPack.upsert({
    where: { code: "JS_CREDITS_10" },
    update: {
      name: "Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    },
    create: {
      code: "JS_CREDITS_10",
      name: "Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    },
  });

  await prisma.jobSeekerCreditPack.upsert({
    where: { code: "JS_CREDITS_30" },
    update: {
      name: "Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    },
    create: {
      code: "JS_CREDITS_30",
      name: "Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    },
  });

  await prisma.jobSeekerCreditPack.upsert({
    where: { code: "JS_CREDITS_70" },
    update: {
      name: "Pro 70",
      credits: 70,
      priceAmount: 24.99,
      currency: "EUR",
      isActive: true,
    },
    create: {
      code: "JS_CREDITS_70",
      name: "Pro 70",
      credits: 70,
      priceAmount: 24.99,
      currency: "EUR",
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

