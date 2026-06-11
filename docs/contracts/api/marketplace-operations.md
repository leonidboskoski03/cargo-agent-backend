---
title: Marketplace Operations API Contract
doc_type: api-contract
status: active
owner: backend
created: 2026-06-06
updated: 2026-06-06
summary: Canonical contract for locations, routes, posts, bids, and contracts.
---

# Marketplace Operations API Contract

All endpoints are mounted under `/api/v1` and require authentication.

## Locations

- `GET /locations`
- `GET /locations/:locationId`
- `POST /locations`
- `PATCH /locations/:locationId`
- `DELETE /locations/:locationId`
- `POST /locations/:locationId/restore`

Admins can create, update, delete, and restore company planning locations. Company drivers can view allowed company route dependencies.

## Routes

- `GET /routes`
- `GET /routes/:routeId`
- `POST /routes`
- `PATCH /routes/:routeId`
- `DELETE /routes/:routeId`
- `POST /routes/:routeId/restore`
- `POST /routes/estimate`

Routes are company-private for normal list/detail/mutation flows. New route creation sets `companyId` from auth. Legacy routes without `companyId` are hidden from normal company route lists.

`POST /routes/estimate` accepts origin/destination location IDs and optional `vehicleProfile: "TRUCK"`. When OpenRouteService is configured, the response includes `distanceKm`, `estimatedDurationMinutes`, `provider`, and `profile`. If the provider is not configured, the API returns a traceable provider-not-configured error.

## Posts

- `GET /posts`
- `GET /posts/:postId`
- `POST /posts`
- `PATCH /posts/:postId`
- `PATCH /posts/:postId/status`
- `DELETE /posts/:postId`
- `POST /posts/:postId/restore`

Post create/update validates route ownership so companies cannot publish posts using another tenant's route. Usage limits apply to active post creation. Status transitions are service-validated.

## Bids

- `GET /bids`
- `GET /bids/:bidId`
- `POST /bids`
- `PATCH /bids/:bidId`
- `PATCH /bids/:bidId/status`
- `DELETE /bids/:bidId`
- `POST /bids/:bidId/restore`

Bids are visible only to authorized parties in the marketplace relationship. Usage limits apply to bid creation. Status transitions are service-validated and emit lifecycle events where configured.

## Contracts

- `GET /contracts`
- `GET /contracts/:contractId`
- `POST /contracts`
- `PATCH /contracts/:contractId/status`
- `DELETE /contracts/:contractId`
- `POST /contracts/:contractId/restore`

Contracts are created from an accepted bid and linked post. Contract visibility is restricted to the shipper and carrier companies involved in the agreement.

## Evidence

- `tests/integration/routesGeoPrivacy.spec.ts`
- `tests/integration/marketplaceScenario.spec.ts`
- `tests/integration/marketplaceEndToEnd.spec.ts`
- `tests/integration/releaseSmokeChain.spec.ts`
- `tests/unit/workflows/marketplaceLifecycle.spec.ts`
