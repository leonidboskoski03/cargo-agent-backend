import { beforeAll, describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { initRuntime, isDatabaseAvailable } from "./_helpers.js";
import { WebhooksService } from "../../src/modules/webhooks/webhooks.service.js";

describe("job seeker webhook idempotency", () => {
  let dbReady = false;
  let monetizationTablesReady = false;

  beforeAll(async () => {
    const runtime = await initRuntime();
    dbReady = await isDatabaseAvailable(runtime.prisma);

    if (dbReady) {
      const table = await runtime.prisma.$queryRawUnsafe<Array<{ table_name: string | null }>>(
        "SELECT to_regclass('public.\"JobSeekerCreditPack\"')::text AS table_name",
      );

      monetizationTablesReady = Boolean(table[0]?.table_name);
    }
  });

  it("credits wallet once when the same checkout event is processed repeatedly", async () => {
    const { prisma } = await initRuntime();
    if (!dbReady || !monetizationTablesReady) {
      return;
    }

    const service = new WebhooksService();
    const suffix = Date.now().toString();

    const user = await prisma.user.create({
      data: {
        role: UserRole.JOB_SEEKER,
        firstName: "Hook",
        lastName: "User",
        email: `hook-user-${suffix}@test.local`,
        passwordHash: "hash",
      },
    });

    const pack = await prisma.jobSeekerCreditPack.create({
      data: {
        code: `HOOK_PACK_${suffix}`,
        name: "Hook Pack",
        credits: 40,
        priceAmount: 14.99,
        currency: "EUR",
        isActive: true,
      },
    });

    const checkout = await prisma.jobSeekerCheckoutSession.create({
      data: {
        userId: user.id,
        creditPackId: pack.id,
        stripeCheckoutSessionId: `cs_hook_${suffix}`,
        amountCredits: 40,
        amountPaid: 14.99,
        currency: "EUR",
      },
    });

    try {
      const eventPayload = {
        id: `evt_hook_${suffix}`,
        type: "checkout.session.completed",
        data: {
          object: {
            id: checkout.stripeCheckoutSessionId,
            metadata: {
              lane: "JOB_SEEKER_CREDITS",
            },
          },
        },
      };

      await service.handleStripeEvent({ event: eventPayload as never, payload: JSON.stringify(eventPayload) });
      await service.handleStripeEvent({ event: eventPayload as never, payload: JSON.stringify(eventPayload) });

      const wallet = await prisma.jobSeekerWallet.findUnique({ where: { userId: user.id } });
      expect(wallet?.balanceCredits).toBe(40);

      const txCount = await prisma.jobSeekerCreditTransaction.count({
        where: {
          userId: user.id,
          reasonCode: "CHECKOUT_TOPUP",
          referenceType: "JOB_SEEKER_CHECKOUT",
          referenceId: checkout.id,
        },
      });
      expect(txCount).toBe(1);
    } finally {
      await prisma.jobSeekerCreditTransaction.deleteMany({ where: { userId: user.id } });
      await prisma.jobSeekerWallet.deleteMany({ where: { userId: user.id } });
      await prisma.jobSeekerCheckoutSession.deleteMany({ where: { id: checkout.id } });
      await prisma.jobSeekerCreditPack.deleteMany({ where: { id: pack.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }, 20_000);
});



