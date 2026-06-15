import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const jobSeekerCreditPackStripePriceIds = {
  JS_CREDITS_10: envValue("STRIPE_JOB_SEEKER_CREDITS_10_PRICE_ID"),
  JS_CREDITS_30: envValue("STRIPE_JOB_SEEKER_CREDITS_30_PRICE_ID"),
  JS_CREDITS_70: envValue("STRIPE_JOB_SEEKER_CREDITS_70_PRICE_ID"),
};

const companyCreditPackStripePriceIds = {
  CO_CREDITS_10: envValue("STRIPE_COMPANY_CREDITS_10_PRICE_ID"),
  CO_CREDITS_30: envValue("STRIPE_COMPANY_CREDITS_30_PRICE_ID"),
  CO_CREDITS_70: envValue("STRIPE_COMPANY_CREDITS_70_PRICE_ID"),
};

function withStripePriceId<T extends Record<string, unknown>>(data: T, stripePriceId?: string) {
  return stripePriceId ? { ...data, stripePriceId } : data;
}

async function main() {
  const supportedCountries = [
    { code: "MK", name: "North Macedonia", nativeName: "Македонија" },
    { code: "BG", name: "Bulgaria", nativeName: "България" },
    { code: "RS", name: "Serbia", nativeName: "Србија" },
    { code: "AL", name: "Albania", nativeName: "Shqipëria" },
    { code: "XK", name: "Kosovo", nativeName: "Kosovë" },
    { code: "GR", name: "Greece", nativeName: "Ελλάδα" },
    { code: "HR", name: "Croatia", nativeName: "Hrvatska" },
    { code: "RO", name: "Romania", nativeName: "România" },
    { code: "BA", name: "Bosnia and Herzegovina", nativeName: "Bosna i Hercegovina" },
    { code: "TR", name: "Turkey", nativeName: "Türkiye" },
  ];

  const countryMetadata: Record<string, {
    displayName: string;
    lat: number;
    lng: number;
    nativeName: string;
    region: string;
  }> = {
    AL: { displayName: "Albania", lat: 41.1533, lng: 20.1683, nativeName: "Shqipëria", region: "Southeast Europe" },
    BA: { displayName: "Bosnia and Herzegovina", lat: 43.9159, lng: 17.6791, nativeName: "Bosna i Hercegovina", region: "Southeast Europe" },
    BG: { displayName: "Bulgaria", lat: 42.7339, lng: 25.4858, nativeName: "България", region: "Southeast Europe" },
    GR: { displayName: "Greece", lat: 39.0742, lng: 21.8243, nativeName: "Ελλάδα", region: "Southeast Europe" },
    HR: { displayName: "Croatia", lat: 45.1, lng: 15.2, nativeName: "Hrvatska", region: "Southeast Europe" },
    MK: { displayName: "North Macedonia", lat: 41.6086, lng: 21.7453, nativeName: "Македонија", region: "Southeast Europe" },
    RO: { displayName: "Romania", lat: 45.9432, lng: 24.9668, nativeName: "România", region: "Southeast Europe" },
    RS: { displayName: "Serbia", lat: 44.0165, lng: 21.0059, nativeName: "Србија", region: "Southeast Europe" },
    TR: { displayName: "Türkiye", lat: 38.9637, lng: 35.2433, nativeName: "Türkiye", region: "Southeast Europe / West Asia" },
    XK: { displayName: "Kosovo", lat: 42.6026, lng: 20.903, nativeName: "Kosovë", region: "Southeast Europe" },
  };

  for (const country of supportedCountries) {
    const metadata = countryMetadata[country.code];
    await prisma.supportedCountry.upsert({
      where: { code: country.code },
      update: { ...metadata, name: country.name, isActive: true },
      create: { ...country, ...metadata, isActive: true },
    });
  }
  await prisma.supportedCountry.updateMany({
    where: { code: { in: ["BIH", "KS"] } },
    data: { isActive: false },
  });

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

  const cityMetadata: Record<string, { adminCode: string; displayName: string }> = {
    "AL:Tirana:Tirana": { adminCode: "AL-11", displayName: "Tirana, Tirana" },
    "BA:Sarajevo:Sarajevo": { adminCode: "BA-BIH", displayName: "Sarajevo, Sarajevo" },
    "BG:Plovdiv:Plovdiv": { adminCode: "BG-16", displayName: "Plovdiv, Plovdiv" },
    "BG:Sofia:Sofia City": { adminCode: "BG-22", displayName: "Sofia, Sofia City" },
    "GR:Thessaloniki:Central Macedonia": { adminCode: "GR-B", displayName: "Thessaloniki, Central Macedonia" },
    "HR:Zagreb:Zagreb": { adminCode: "HR-21", displayName: "Zagreb, Zagreb" },
    "MK:Bitola:Pelagonia": { adminCode: "MK-04", displayName: "Bitola, Pelagonia" },
    "MK:Ohrid:Southwestern": { adminCode: "MK-58", displayName: "Ohrid, Southwestern" },
    "MK:Prilep:Pelagonia": { adminCode: "MK-62", displayName: "Prilep, Pelagonia" },
    "MK:Skopje:Skopje": { adminCode: "MK-85", displayName: "Skopje, Skopje" },
    "MK:Tetovo:Polog": { adminCode: "MK-76", displayName: "Tetovo, Polog" },
    "RO:Bucharest:Bucharest": { adminCode: "RO-B", displayName: "Bucharest, Bucharest" },
    "RS:Belgrade:Belgrade": { adminCode: "RS-00", displayName: "Belgrade, Belgrade" },
    "RS:Nis:Nisava": { adminCode: "RS-20", displayName: "Nis, Nisava" },
    "TR:Istanbul:Istanbul": { adminCode: "TR-34", displayName: "Istanbul, Istanbul" },
    "XK:Pristina:Pristina": { adminCode: "XK-01", displayName: "Pristina, Pristina" },
  };

  for (const city of supportedCities) {
    const metadata = cityMetadata[`${city.countryCode}:${city.name}:${city.region}`];
    await prisma.supportedCity.upsert({
      where: {
        countryCode_name_region: {
          countryCode: city.countryCode,
          name: city.name,
          region: city.region,
        },
      },
      update: {
        adminCode: metadata?.adminCode,
        displayName: metadata?.displayName,
        lat: city.lat,
        lng: city.lng,
        isActive: true,
      },
      create: {
        countryCode: city.countryCode,
        adminCode: metadata?.adminCode,
        displayName: metadata?.displayName,
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
    update: withStripePriceId({
      name: "Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    }, jobSeekerCreditPackStripePriceIds.JS_CREDITS_10),
    create: withStripePriceId({
      code: "JS_CREDITS_10",
      name: "Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    }, jobSeekerCreditPackStripePriceIds.JS_CREDITS_10),
  });

  await prisma.jobSeekerCreditPack.upsert({
    where: { code: "JS_CREDITS_30" },
    update: withStripePriceId({
      name: "Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    }, jobSeekerCreditPackStripePriceIds.JS_CREDITS_30),
    create: withStripePriceId({
      code: "JS_CREDITS_30",
      name: "Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    }, jobSeekerCreditPackStripePriceIds.JS_CREDITS_30),
  });

  await prisma.jobSeekerCreditPack.upsert({
    where: { code: "JS_CREDITS_70" },
    update: withStripePriceId({
      name: "Pro 70",
      credits: 70,
      priceAmount: 24.99,
      currency: "EUR",
      isActive: true,
    }, jobSeekerCreditPackStripePriceIds.JS_CREDITS_70),
    create: withStripePriceId({
      code: "JS_CREDITS_70",
      name: "Pro 70",
      credits: 70,
      priceAmount: 24.99,
      currency: "EUR",
      isActive: true,
    }, jobSeekerCreditPackStripePriceIds.JS_CREDITS_70),
  });

  await prisma.companyCreditPack.upsert({
    where: { code: "CO_CREDITS_10" },
    update: withStripePriceId({
      name: "Company Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    }, companyCreditPackStripePriceIds.CO_CREDITS_10),
    create: withStripePriceId({
      code: "CO_CREDITS_10",
      name: "Company Starter 10",
      credits: 10,
      priceAmount: 4.99,
      currency: "EUR",
      isActive: true,
    }, companyCreditPackStripePriceIds.CO_CREDITS_10),
  });

  await prisma.companyCreditPack.upsert({
    where: { code: "CO_CREDITS_30" },
    update: withStripePriceId({
      name: "Company Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    }, companyCreditPackStripePriceIds.CO_CREDITS_30),
    create: withStripePriceId({
      code: "CO_CREDITS_30",
      name: "Company Growth 30",
      credits: 30,
      priceAmount: 12.99,
      currency: "EUR",
      isActive: true,
    }, companyCreditPackStripePriceIds.CO_CREDITS_30),
  });

  await prisma.companyCreditPack.upsert({
    where: { code: "CO_CREDITS_70" },
    update: withStripePriceId({
      name: "Company Pro 70",
      credits: 70,
      priceAmount: 24.99,
      currency: "EUR",
      isActive: true,
    }, companyCreditPackStripePriceIds.CO_CREDITS_70),
    create: withStripePriceId({
      code: "CO_CREDITS_70",
      name: "Company Pro 70",
      credits: 70,
      priceAmount: 24.99,
      currency: "EUR",
      isActive: true,
    }, companyCreditPackStripePriceIds.CO_CREDITS_70),
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

