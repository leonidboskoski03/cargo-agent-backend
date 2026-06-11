---
title: Route Marketplace API Contract
status: active
updated: 2026-06-10
---

# Route Marketplace API Contract

This contract covers the company route marketplace surfaces that connect transport posts, bids, and contracts. Existing post, bid, and contract response shapes remain stable; the endpoints below document the latest additive closure work.

## Bid Acceptance And Contract Creation

### `PATCH /api/v1/bids/:bidId/status`

When called with `status: "ACCEPTED"`, the backend accepts the bid and creates the contract in the same transaction.

Rules:
- Only the owning post company's admin may accept a received pending bid.
- Drivers remain read-only.
- The accepted bid must include an offered price.
- Competing pending bids are rejected according to the existing accept-and-close-post behavior.
- The post is assigned.
- A `CONFIRMED` contract is created from the accepted bid price and currency.
- Repeated/fallback contract creation remains idempotent by accepted bid.

Response additions:

```json
{
  "id": "cm...",
  "status": "ACCEPTED",
  "contract": {
    "id": "cm...",
    "status": "CONFIRMED"
  }
}
```

The frontend should treat this accepted-bid response as the primary contract handoff and show `Open contract`, not a separate manual create-contract action.

## Post Boosting

### `POST /api/v1/posts/:postId/boost`

Boosts an owned open transport post using company credits.

Access:
- Authenticated `COMPANY_ADMIN` only.
- The post must belong to the caller's company.
- Drivers can view boosted posts but cannot boost.

Behavior:
- Credit cost comes from `COMPANY_POST_BOOST_CREDIT_COST`, default `2`.
- Boost duration comes from `MARKETPLACE_BOOST_DURATION_DAYS`, default `7`.
- If the post is already actively boosted, the boost extends from the current `promotedUntil`; otherwise it starts from now.
- The credit ledger records `reasonCode: "TRANSPORT_POST_BOOST"` and `referenceType: "POST"`.
- Public marketplace ordering ranks actively boosted posts first, then later `promotedUntil`, then newest posts.

Response additions:

```json
{
  "id": "cm...",
  "isPromoted": true,
  "promotedUntil": "2026-06-17T10:00:00.000Z",
  "billing": {
    "mode": "CREDITS",
    "creditCost": 2,
    "walletBalanceCredits": 18
  }
}
```

Insufficient company credits return `402 INSUFFICIENT_CREDITS` with trace-friendly details.

## Bid Boosting

### `POST /api/v1/bids/:bidId/boost`

Boosts a pending sent bid using company credits. Boosting improves received-bid ordering and displays a boost label; it does not guarantee acceptance.

Access:
- Authenticated `COMPANY_ADMIN` only.
- The bid must belong to the caller's company.
- The bid must be `PENDING`.
- Drivers can view involved bids but cannot boost.

Request body:

```json
{
  "creditAmount": 5
}
```

Rules:
- `creditAmount` must be a positive integer.
- There is no hard maximum.
- Spend accumulates in `boostCredits`.
- `boostedUntil` extends by the configured boost duration from the later of now or the existing boost expiry.
- Received bid lists rank actively boosted bids first, then higher cumulative boost credits, then the normal ordering.
- Counterparties see only a `Boosted bid` label, not the exact credits spent.

Response additions:

```json
{
  "id": "cm...",
  "boostCredits": 5,
  "boostedUntil": "2026-06-17T10:00:00.000Z",
  "billing": {
    "mode": "CREDITS",
    "creditCost": 5,
    "walletBalanceCredits": 13
  }
}
```

The bid activity timeline records a `BOOSTED` activity for participant-visible history.

## Bid Activities

### `GET /api/v1/bids/:bidId/activities`

Returns the participant-visible operational history for a bid.

Access:
- Authenticated company users only.
- Visible to the post owner company and bidding company.
- Company drivers may view activities for involved bids.
- Mutation permissions remain on the existing bid endpoints.

Activity types:
- `CREATED`
- `UPDATED`
- `BOOSTED`
- `ACCEPTED`
- `REJECTED`
- `WITHDRAWN`
- `DELETED`
- `RESTORED`
- `CONTRACT_CREATED`

Response item shape:

```json
{
  "id": "cm...",
  "bidId": "cm...",
  "actorUserId": "cm...",
  "actorCompanyId": "cm...",
  "type": "ACCEPTED",
  "message": "Bid accepted",
  "metadataJson": {
    "postId": "cm..."
  },
  "createdAt": "2026-06-09T10:00:00.000Z"
}
```

## Contract Timeline

### `PATCH /api/v1/contracts/:contractId/timeline`

Updates planned and actual pickup/delivery fields without changing contract status.

Access:
- Authenticated company admins only.
- Company must be either shipper or carrier on the contract.
- Drivers can view contracts but cannot update timeline fields.

Request body:

```json
{
  "pickupPlannedAt": "2026-06-09T08:00:00.000Z",
  "deliveryPlannedAt": "2026-06-09T14:00:00.000Z",
  "pickupActualAt": "2026-06-09T09:00:00.000Z",
  "deliveryActualAt": "2026-06-09T15:00:00.000Z"
}
```

Rules:
- At least one timeline field is required.
- `deliveryPlannedAt` cannot be before `pickupPlannedAt`.
- `deliveryActualAt` cannot be before `pickupActualAt`.
- Actual dates are allowed only after the contract is `IN_PROGRESS` or `COMPLETED`.
- Timeline edits do not automatically change contract status.

Audit:
- Successful updates write `CONTRACT_TIMELINE_UPDATED`.
