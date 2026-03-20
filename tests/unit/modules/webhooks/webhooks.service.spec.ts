import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { WebhooksService } from "../../../../src/modules/webhooks/webhooks.service.js";
import { WebhooksRepository } from "../../../../src/modules/webhooks/webhooks.repository.js";

describe("WebhooksService", () => {
  const service = new WebhooksService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores unsupported Stripe event types", async () => {
    const persistSpy = vi.spyOn(WebhooksRepository.prototype, "persistBillingEvent");

    const response = await service.handleStripeEvent({
      event: {
        id: "evt_unsupported",
        type: "payment_intent.succeeded",
      } as unknown as Stripe.Event,
      payload: JSON.stringify({}),
    });

    expect(response).toEqual({ received: true, ignored: true });
    expect(persistSpy).not.toHaveBeenCalled();
  });

  it("ignores already-processed Stripe event replays", async () => {
    vi.spyOn(WebhooksRepository.prototype, "hasBillingEventByProviderEventId").mockResolvedValue(true);
    const markCheckoutSpy = vi.spyOn(WebhooksRepository.prototype, "markCheckoutCompleted");

    const response = await service.handleStripeEvent({
      event: {
        id: "evt_replay",
        type: "checkout.session.completed",
        data: { object: { id: "cs_replay", client_reference_id: "company_1", metadata: {} } },
      } as unknown as Stripe.Event,
      payload: JSON.stringify({}),
    });

    expect(response).toEqual({ received: true, ignored: true });
    expect(markCheckoutSpy).not.toHaveBeenCalled();
  });

  it("does not mark checkout completed when billing event already exists", async () => {
    vi.spyOn(WebhooksRepository.prototype, "persistBillingEvent").mockResolvedValue({ inserted: false, event: null } as never);
    const markCheckoutSpy = vi.spyOn(WebhooksRepository.prototype, "markCheckoutCompleted").mockResolvedValue({ count: 0 } as never);

    const response = await service.handleStripeEvent({
      event: {
        id: "evt_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_1",
            client_reference_id: "company_1",
            metadata: {},
          },
        },
      } as unknown as Stripe.Event,
      payload: JSON.stringify({ id: "evt_checkout" }),
    });

    expect(response).toEqual({ received: true, ignored: false });
    expect(markCheckoutSpy).not.toHaveBeenCalled();
  });

  it("processes job seeker checkout lane by granting credits", async () => {
    const persistSpy = vi.spyOn(WebhooksRepository.prototype, "persistBillingEvent");
    vi.spyOn(WebhooksRepository.prototype, "getJobSeekerCheckoutSessionByStripeId").mockResolvedValue({
      id: "js_checkout_1",
      userId: "user_1",
      amountCredits: 30,
    } as never);
    const grantSpy = vi.spyOn(WebhooksRepository.prototype, "grantJobSeekerCreditsFromCheckout").mockResolvedValue({
      inserted: true,
      transactionId: "tx_1",
    } as never);

    const response = await service.handleStripeEvent({
      event: {
        id: "evt_js_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_js_1",
            metadata: {
              lane: "JOB_SEEKER_CREDITS",
            },
          },
        },
      } as unknown as Stripe.Event,
      payload: JSON.stringify({ id: "evt_js_checkout" }),
    });

    expect(response).toEqual({ received: true, ignored: false });
    expect(grantSpy).toHaveBeenCalledWith({
      checkoutSessionId: "js_checkout_1",
      stripeCheckoutSessionId: "cs_js_1",
      userId: "user_1",
      amountCredits: 30,
    });
    expect(persistSpy).not.toHaveBeenCalled();
  });

  it("skips job seeker checkout lane when local checkout session does not exist", async () => {
    const grantSpy = vi.spyOn(WebhooksRepository.prototype, "grantJobSeekerCreditsFromCheckout");
    vi.spyOn(WebhooksRepository.prototype, "getJobSeekerCheckoutSessionByStripeId").mockResolvedValue(null);

    const response = await service.handleStripeEvent({
      event: {
        id: "evt_js_missing",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_js_missing",
            metadata: {
              lane: "JOB_SEEKER_CREDITS",
            },
          },
        },
      } as unknown as Stripe.Event,
      payload: JSON.stringify({ id: "evt_js_missing" }),
    });

    expect(response).toEqual({ received: true, ignored: false });
    expect(grantSpy).not.toHaveBeenCalled();
  });
});

