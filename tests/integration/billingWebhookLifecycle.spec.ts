import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { BillingEventType, CompanyType, JobSeekerCreditTxType, PlanCode, UserRole } from "@prisma/client";
import { initRuntime, isDatabaseAvailable } from "./_helpers.js";

describe("billing webhook lifecycle", () => {
  let dbReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);
  });

  it("processes checkout.session.completed idempotently for company and job seeker checkout lanes", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-checkout`;

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.SHIPPER,
        name: `Webhook Company ${suffix}`,
        registrationNumber: `WB-COMP-${suffix}`,
        countryCode: "MK",
        city: "Skopje",
      },
      select: { id: true },
    });

    const seeker = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Webhook",
        lastName: "Seeker",
        email: `webhook-seeker-${suffix}@test.local`,
        passwordHash: "hash",
      },
      select: { id: true },
    });

    const creditPack = await prisma.jobSeekerCreditPack.create({
      data: {
        code: `WB_PACK_${suffix.replace(/[^0-9]/g, "")}`,
        name: "Webhook Pack",
        credits: 25,
        priceAmount: 9.99,
        currency: "EUR",
      },
      select: { id: true },
    });

    const companyCheckoutStripeId = `cs_company_${suffix}`;
    const seekerCheckoutStripeId = `cs_seeker_${suffix}`;

    await prisma.checkoutSession.create({
      data: {
        companyId: company.id,
        stripeCheckoutSessionId: companyCheckoutStripeId,
        planCode: PlanCode.PRO,
      },
    });

    const seekerCheckout = await prisma.jobSeekerCheckoutSession.create({
      data: {
        userId: seeker.id,
        creditPackId: creditPack.id,
        stripeCheckoutSessionId: seekerCheckoutStripeId,
        amountCredits: 25,
        amountPaid: 9.99,
        currency: "EUR",
      },
      select: { id: true },
    });

    const companyEvent = {
      id: `evt_company_${suffix}`,
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: companyCheckoutStripeId,
          object: "checkout.session",
          client_reference_id: company.id,
          metadata: {
            companyId: company.id,
          },
        },
      },
    };

    const seekerEvent = {
      id: `evt_seeker_${suffix}`,
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: seekerCheckoutStripeId,
          object: "checkout.session",
          metadata: {
            lane: "JOB_SEEKER_CREDITS",
            userId: seeker.id,
          },
        },
      },
    };

    try {
      const companyResponse = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(companyEvent));
      expect(companyResponse.statusCode).toBe(200);

      const companyReplay = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(companyEvent));
      expect(companyReplay.statusCode).toBe(200);

      const companyCheckout = await prisma.checkoutSession.findUnique({
        where: { stripeCheckoutSessionId: companyCheckoutStripeId },
        select: { status: true, completedAt: true },
      });
      expect(companyCheckout?.status).toBe("COMPLETED");
      expect(companyCheckout?.completedAt).toBeTruthy();

      const companyEventsCount = await prisma.billingEvent.count({
        where: {
          companyId: company.id,
          providerEventId: companyEvent.id,
          eventType: BillingEventType.CHECKOUT_COMPLETED,
        },
      });
      expect(companyEventsCount).toBe(1);

      const seekerResponse = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(seekerEvent));
      expect(seekerResponse.statusCode).toBe(200);

      const seekerReplay = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(seekerEvent));
      expect(seekerReplay.statusCode).toBe(200);

      const wallet = await prisma.jobSeekerWallet.findUnique({
        where: { userId: seeker.id },
        select: { balanceCredits: true },
      });
      expect(wallet?.balanceCredits).toBe(25);

      const purchaseTxCount = await prisma.jobSeekerCreditTransaction.count({
        where: {
          userId: seeker.id,
          type: JobSeekerCreditTxType.PURCHASE,
          reasonCode: "CHECKOUT_TOPUP",
          referenceId: seekerCheckout.id,
        },
      });
      expect(purchaseTxCount).toBe(1);

      const updatedCheckout = await prisma.jobSeekerCheckoutSession.findUnique({
        where: { id: seekerCheckout.id },
        select: { status: true, completedAt: true },
      });
      expect(updatedCheckout?.status).toBe("COMPLETED");
      expect(updatedCheckout?.completedAt).toBeTruthy();
    } finally {
      await prisma.billingEvent.deleteMany({ where: { companyId: company.id } });
      await prisma.checkoutSession.deleteMany({ where: { companyId: company.id } });
      await prisma.jobSeekerCreditTransaction.deleteMany({ where: { userId: seeker.id } });
      await prisma.jobSeekerCheckoutSession.deleteMany({ where: { userId: seeker.id } });
      await prisma.jobSeekerWallet.deleteMany({ where: { userId: seeker.id } });
      await prisma.jobSeekerCreditPack.deleteMany({ where: { id: creditPack.id } });
      await prisma.user.deleteMany({ where: { id: seeker.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("applies subscription created/deleted webhook lifecycle and keeps a single current subscription", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-sub`;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: { isActive: true },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
      },
      select: { id: true },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: { isActive: true },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Subscription Co ${suffix}`,
        registrationNumber: `WB-SUB-${suffix}`,
        countryCode: "MK",
        city: "Skopje",
        stripeCustomerId: `cus_${suffix}`,
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
      select: { id: true, stripeCustomerId: true },
    });

    const createdEvent = {
      id: `evt_sub_created_${suffix}`,
      object: "event",
      type: "customer.subscription.created",
      data: {
        object: {
          id: `sub_${suffix}`,
          object: "subscription",
          customer: company.stripeCustomerId,
          status: "active",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          metadata: { companyId: company.id },
          items: {
            data: [],
          },
        },
      },
    };

    const deletedEvent = {
      id: `evt_sub_deleted_${suffix}`,
      object: "event",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: `sub_${suffix}`,
          object: "subscription",
          customer: company.stripeCustomerId,
          status: "canceled",
          cancel_at_period_end: false,
          canceled_at: Math.floor(Date.now() / 1000),
          metadata: { companyId: company.id },
          items: {
            data: [],
          },
        },
      },
    };

    try {
      const createdResponse = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(createdEvent));
      expect(createdResponse.statusCode).toBe(200);

      const companyAfterCreate = await prisma.company.findUnique({
        where: { id: company.id },
        select: { currentPlanId: true, subscriptionStatus: true },
      });
      expect(companyAfterCreate?.currentPlanId).toBe(proPlan.id);
      expect(companyAfterCreate?.subscriptionStatus).toBe("ACTIVE");

      const currentAfterCreate = await prisma.subscription.findMany({
        where: { companyId: company.id, isCurrent: true },
        select: { id: true, status: true, planId: true, stripeSubscriptionId: true },
      });
      expect(currentAfterCreate).toHaveLength(1);
      expect(currentAfterCreate[0]?.status).toBe("ACTIVE");
      expect(currentAfterCreate[0]?.planId).toBe(proPlan.id);

      const deletedResponse = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(deletedEvent));
      expect(deletedResponse.statusCode).toBe(200);

      const companyAfterDelete = await prisma.company.findUnique({
        where: { id: company.id },
        select: { currentPlanId: true, subscriptionStatus: true },
      });
      expect(companyAfterDelete?.currentPlanId).toBe(freePlan.id);
      expect(companyAfterDelete?.subscriptionStatus).toBe("FREE");

      const currentAfterDelete = await prisma.subscription.findMany({
        where: { companyId: company.id, isCurrent: true },
        select: { status: true, planId: true },
      });
      expect(currentAfterDelete).toHaveLength(1);
      expect(currentAfterDelete[0]?.status).toBe("FREE");
      expect(currentAfterDelete[0]?.planId).toBe(freePlan.id);

      const billingEvents = await prisma.billingEvent.findMany({
        where: { companyId: company.id },
        select: { providerEventId: true, eventType: true },
      });
      const eventIds = billingEvents.map((item) => item.providerEventId);
      expect(eventIds).toContain(createdEvent.id);
      expect(eventIds).toContain(deletedEvent.id);
    } finally {
      await prisma.billingEvent.deleteMany({ where: { companyId: company.id } });
      await prisma.subscription.deleteMany({ where: { companyId: company.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("handles subscription.updated replay idempotently without extra version bumps", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-updated-replay`;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: { isActive: true },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
      },
      select: { id: true },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: PlanCode.PRO },
      update: { isActive: true },
      create: {
        code: PlanCode.PRO,
        name: "Pro",
        priceAmount: 49,
        currency: "EUR",
        isActive: true,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Webhook Updated ${suffix}`,
        registrationNumber: `WB-UPD-${suffix}`,
        countryCode: "MK",
        city: "Skopje",
        stripeCustomerId: `cus_upd_${suffix}`,
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
      select: { id: true, stripeCustomerId: true },
    });

    const createdEvent = {
      id: `evt_sub_created_${suffix}`,
      object: "event",
      type: "customer.subscription.created",
      data: {
        object: {
          id: `sub_upd_${suffix}`,
          object: "subscription",
          customer: company.stripeCustomerId,
          status: "active",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          metadata: { companyId: company.id },
          items: { data: [] },
        },
      },
    };

    const updatedEvent = {
      id: `evt_sub_updated_${suffix}`,
      object: "event",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: `sub_upd_${suffix}`,
          object: "subscription",
          customer: company.stripeCustomerId,
          status: "past_due",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at_period_end: true,
          metadata: { companyId: company.id },
          items: { data: [] },
        },
      },
    };

    try {
      const createdResponse = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(createdEvent));
      expect(createdResponse.statusCode).toBe(200);

      const beforeUpdate = await prisma.subscription.findFirst({
        where: { companyId: company.id, isCurrent: true },
        select: { id: true, version: true },
      });
      expect(beforeUpdate).toBeTruthy();

      const updatedResponse = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(updatedEvent));
      expect(updatedResponse.statusCode).toBe(200);

      const afterUpdate = await prisma.subscription.findFirst({
        where: { companyId: company.id, isCurrent: true },
        select: { id: true, version: true, status: true, cancelAtPeriodEnd: true, planId: true },
      });

      expect(afterUpdate?.planId).toBe(proPlan.id);
      expect(afterUpdate?.status).toBe("PAST_DUE");
      expect(afterUpdate?.cancelAtPeriodEnd).toBe(true);
      expect(afterUpdate?.version).toBe((beforeUpdate?.version ?? 0) + 1);

      const replayResponse = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(updatedEvent));
      expect(replayResponse.statusCode).toBe(200);

      const afterReplay = await prisma.subscription.findFirst({
        where: { companyId: company.id, isCurrent: true },
        select: { version: true, status: true, cancelAtPeriodEnd: true },
      });

      expect(afterReplay?.version).toBe(afterUpdate?.version);
      expect(afterReplay?.status).toBe("PAST_DUE");
      expect(afterReplay?.cancelAtPeriodEnd).toBe(true);

      const updatedEventsCount = await prisma.billingEvent.count({
        where: {
          companyId: company.id,
          providerEventId: updatedEvent.id,
          eventType: BillingEventType.SUBSCRIPTION_UPDATED,
        },
      });
      expect(updatedEventsCount).toBe(1);
    } finally {
      await prisma.billingEvent.deleteMany({ where: { companyId: company.id } });
      await prisma.subscription.deleteMany({ where: { companyId: company.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);

  it("handles invoice replay idempotently and keeps single billing event rows per provider event id", async () => {
    const { prisma, buildApp } = await initRuntime();
    if (!dbReady) {
      return;
    }

    const app = buildApp();
    const suffix = `${Date.now()}-invoice-replay`;

    const freePlan = await prisma.plan.upsert({
      where: { code: PlanCode.FREE },
      update: { isActive: true },
      create: {
        code: PlanCode.FREE,
        name: "Free",
        priceAmount: 0,
        currency: "EUR",
        isActive: true,
      },
      select: { id: true },
    });

    const company = await prisma.company.create({
      data: {
        companyType: CompanyType.CARRIER,
        name: `Webhook Invoice ${suffix}`,
        registrationNumber: `WB-INV-${suffix}`,
        countryCode: "MK",
        city: "Skopje",
        stripeCustomerId: `cus_invoice_${suffix}`,
        currentPlanId: freePlan.id,
        subscriptionStatus: "FREE",
      },
      select: { id: true, stripeCustomerId: true },
    });

    await prisma.subscription.create({
      data: {
        companyId: company.id,
        planId: freePlan.id,
        status: "FREE",
        isCurrent: true,
      },
    });

    const paidEvent = {
      id: `evt_invoice_paid_${suffix}`,
      object: "event",
      type: "invoice.paid",
      data: {
        object: {
          id: `in_paid_${suffix}`,
          object: "invoice",
          customer: company.stripeCustomerId,
          amount_paid: 4900,
          currency: "eur",
          payment_intent: `pi_paid_${suffix}`,
        },
      },
    };

    const failedEvent = {
      id: `evt_invoice_failed_${suffix}`,
      object: "event",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: `in_failed_${suffix}`,
          object: "invoice",
          customer: company.stripeCustomerId,
          amount_paid: 0,
          currency: "eur",
          payment_intent: `pi_failed_${suffix}`,
        },
      },
    };

    try {
      const firstPaid = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(paidEvent));
      const replayPaid = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(paidEvent));
      expect(firstPaid.statusCode).toBe(200);
      expect(replayPaid.statusCode).toBe(200);

      const firstFailed = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(failedEvent));
      const replayFailed = await request(app)
        .post("/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(failedEvent));
      expect(firstFailed.statusCode).toBe(200);
      expect(replayFailed.statusCode).toBe(200);

      const paidCount = await prisma.billingEvent.count({
        where: {
          companyId: company.id,
          providerEventId: paidEvent.id,
          eventType: BillingEventType.INVOICE_PAID,
        },
      });
      const failedCount = await prisma.billingEvent.count({
        where: {
          companyId: company.id,
          providerEventId: failedEvent.id,
          eventType: BillingEventType.INVOICE_PAYMENT_FAILED,
        },
      });

      expect(paidCount).toBe(1);
      expect(failedCount).toBe(1);
    } finally {
      await prisma.billingEvent.deleteMany({ where: { companyId: company.id } });
      await prisma.subscription.deleteMany({ where: { companyId: company.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
    }
  }, 25_000);
});
