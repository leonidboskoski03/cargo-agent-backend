export type StripeLifecycleEvent =
  | "checkout.session.completed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed";

export function isSupportedStripeLifecycleEvent(value: string): value is StripeLifecycleEvent {
  return (
    value === "checkout.session.completed" ||
    value === "customer.subscription.created" ||
    value === "customer.subscription.updated" ||
    value === "customer.subscription.deleted" ||
    value === "invoice.paid" ||
    value === "invoice.payment_failed"
  );
}

