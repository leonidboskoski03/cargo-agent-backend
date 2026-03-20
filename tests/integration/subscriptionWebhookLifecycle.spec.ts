import { beforeAll, describe, expect, it } from "vitest";
import { PlanCode } from "@prisma/client";
import { initRuntime, isDatabaseAvailable } from "./_helpers.js";
import { WebhooksService } from "../../src/modules/webhooks/webhooks.service.js";

describe("subscription webhook lifecycle", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("applies subscription created/deleted events and ignores replays", async () => {
    const { prisma } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const service = new WebhooksService();
    const suffix = Date.now().toString();
    const stripeCustomerId = `cus_${suffix}`;
    const stripeSubscriptionId = `sub_${suffix}`;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: { isActive: true, name: "Free", priceAmount: 0, currency: "EUR" },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
      },
    });

    await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: { isActive: true, name: "Pro", priceAmount: 49, currency: "EUR", billingInterval: "MONTHLY" },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        billingInterval: "MONTHLY",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
      },
    });

    const company = await prisma.company.create({
      data: {
        companyType: "CARRIER",
        name: `Webhook Co ${suffix}`,
        registrationNumber: `WH-${suffix}`,
        countryCode: "RS",
        city: "Nis",
        stripeCustomerId,
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
    });

    const createdEvent = {
      id: `evt_sub_created_${suffix}`,
      type: "customer.subscription.created",
      data: {
        object: {
          id: stripeSubscriptionId,
          customer: stripeCustomerId,
          status: "active",
          start_date: Math.floor(Date.now() / 1000),
          trial_end: null,
          cancel_at_period_end: false,
          canceled_at: null,
          items: {
            data: [
              {
                price: {
                  id: null,
                },
              },
            ],
          },
          metadata: {
            companyId: company.id,
          },
        },
      },
    };

    const deletedEvent = {
      id: `evt_sub_deleted_${suffix}`,
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: stripeSubscriptionId,
          customer: stripeCustomerId,
          status: "canceled",
          start_date: Math.floor(Date.now() / 1000),
          trial_end: null,
          cancel_at_period_end: true,
          canceled_at: Math.floor(Date.now() / 1000),
          items: {
            data: [],
          },
          metadata: {
            companyId: company.id,
          },
        },
      },
    };

    try {
      await service.handleStripeEvent({ event: createdEvent as never, payload: JSON.stringify(createdEvent) });

      const currentAfterCreate = await prisma.subscription.findFirst({
        where: { companyId: company.id, isCurrent: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
      expect(currentAfterCreate).toBeTruthy();
      expect(currentAfterCreate?.stripeSubscriptionId).toBe(stripeSubscriptionId);
      expect(currentAfterCreate?.status).toBe("ACTIVE");

      const versionBeforeReplay = currentAfterCreate?.version;

      await service.handleStripeEvent({ event: createdEvent as never, payload: JSON.stringify(createdEvent) });

      const currentAfterReplay = await prisma.subscription.findFirst({
        where: { companyId: company.id, isCurrent: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
      expect(currentAfterReplay?.version).toBe(versionBeforeReplay);

      const createdEventCount = await prisma.billingEvent.count({
        where: { providerEventId: createdEvent.id },
      });
      expect(createdEventCount).toBe(1);

      await service.handleStripeEvent({ event: deletedEvent as never, payload: JSON.stringify(deletedEvent) });

      const currentAfterDelete = await prisma.subscription.findFirst({
        where: { companyId: company.id, isCurrent: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
      expect(currentAfterDelete).toBeTruthy();
      expect(currentAfterDelete?.status).toBe("FREE");

      const companyAfterDelete = await prisma.company.findUnique({ where: { id: company.id } });
      expect(companyAfterDelete?.subscriptionStatus).toBe("FREE");

      await service.handleStripeEvent({ event: deletedEvent as never, payload: JSON.stringify(deletedEvent) });

      const deletedEventCount = await prisma.billingEvent.count({
        where: { providerEventId: deletedEvent.id },
      });
      expect(deletedEventCount).toBe(1);
    } finally {
      await prisma.billingEvent.deleteMany({ where: { companyId: company.id } });
      await prisma.subscription.deleteMany({ where: { companyId: company.id } });
      await prisma.checkoutSession.deleteMany({ where: { companyId: company.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);
});

