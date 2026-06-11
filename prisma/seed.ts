import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const supportedCountries = [
    { code: "MK", name: "North Macedonia", nativeName: "Македонија" },
    { code: "BG", name: "Bulgaria", nativeName: "България" },
    { code: "RS", name: "Serbia", nativeName: "Србија" },
    { code: "AL", name: "Albania", nativeName: "Shqipëria" },
    { code: "KS", name: "Kosovo", nativeName: "Kosovë" },
    { code: "GR", name: "Greece", nativeName: "Ελλάδα" },
    { code: "HR", name: "Croatia", nativeName: "Hrvatska" },
    { code: "RO", name: "Romania", nativeName: "România" },
    { code: "BIH", name: "Bosnia and Herzegovina", nativeName: "Bosna i Hercegovina" },
    { code: "TR", name: "Turkey", nativeName: "Türkiye" },
  ];

  for (const country of supportedCountries) {
    await prisma.supportedCountry.upsert({
      where: { code: country.code },
      update: { name: country.name, nativeName: country.nativeName, isActive: true },
      create: { ...country, isActive: true },
    });
  }

  const supportedCities = [
    { countryCode: "MK", name: "Skopje", region: "Skopje", lat: 41.9973, lng: 21.4280 },
    { countryCode: "MK", name: "Bitola", region: "Pelagonia", lat: 41.0319, lng: 21.3347 },
    { countryCode: "MK", name: "Prilep", region: "Pelagonia", lat: 41.3464, lng: 21.5545 },
    { countryCode: "MK", name: "Ohrid", region: "Southwestern", lat: 41.1231, lng: 20.8016 },
    { countryCode: "MK", name: "Tetovo", region: "Polog", lat: 42.0069, lng: 20.9715 },
    { countryCode: "BG", name: "Sofia", region: "Sofia City", lat: 42.6977, lng: 23.3219 },
    { countryCode: "BG", name: "Plovdiv", region: "Plovdiv", lat: 42.1354, lng: 24.7453 },
    { countryCode: "RS", name: "Belgrade", region: "Belgrade", lat: 44.8125, lng: 20.4612 },
    { countryCode: "RS", name: "Nis", region: "Nisava", lat: 43.3209, lng: 21.8958 },
    { countryCode: "AL", name: "Tirana", region: "Tirana", lat: 41.3275, lng: 19.8187 },
    { countryCode: "XK", name: "Pristina", region: "Pristina", lat: 42.6629, lng: 21.1655 },
    { countryCode: "GR", name: "Thessaloniki", region: "Central Macedonia", lat: 40.6401, lng: 22.9444 },
    { countryCode: "HR", name: "Zagreb", region: "Zagreb", lat: 45.8150, lng: 15.9819 },
    { countryCode: "RO", name: "Bucharest", region: "Bucharest", lat: 44.4268, lng: 26.1025 },
    { countryCode: "BA", name: "Sarajevo", region: "Sarajevo", lat: 43.8563, lng: 18.4131 },
    { countryCode: "TR", name: "Istanbul", region: "Istanbul", lat: 41.0082, lng: 28.9784 },
  ];

  for (const city of supportedCities) {
    await prisma.supportedCity.upsert({
      where: {
        countryCode_name_region: {
          countryCode: city.countryCode,
          name: city.name,
          region: city.region,
        },
      },
      update: {
        lat: city.lat,
        lng: city.lng,
        isActive: true,
      },
      create: {
        countryCode: city.countryCode,
        name: city.name,
        region: city.region,
        lat: city.lat,
        lng: city.lng,
        isActive: true,
      },
    });
  }

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

  await prisma.companyCreditPack.upsert({
    where: { code: "CO_CREDITS_10" },
    update: {
      name: "Company Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    },
    create: {
      code: "CO_CREDITS_10",
      name: "Company Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    },
  });

  await prisma.companyCreditPack.upsert({
    where: { code: "CO_CREDITS_30" },
    update: {
      name: "Company Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    },
    create: {
      code: "CO_CREDITS_30",
      name: "Company Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    },
  });

  await prisma.companyCreditPack.upsert({
    where: { code: "CO_CREDITS_70" },
    update: {
      name: "Company Pro 70",
      credits: 70,
      priceAmount: 24.99,
      currency: "EUR",
      isActive: true,
    },
    create: {
      code: "CO_CREDITS_70",
      name: "Company Pro 70",
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

