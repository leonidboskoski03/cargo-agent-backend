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

  await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {
      name: "Pro",
      billingInterval: "MONTHLY",
      currency: "EUR",
      isActive: true,
      maxActivePosts: null,
      maxBidsPerMonth: null,
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
      maxActivePosts: null,
      maxBidsPerMonth: null,
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

