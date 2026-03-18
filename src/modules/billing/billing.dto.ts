export type BillingEventDto = {
  id: string;
  eventType: string;
  status: string | null;
  amount: string | null;
  currency: string | null;
  createdAt: string;
};

