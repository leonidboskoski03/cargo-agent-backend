---
title: Vehicle Marketplace API Contract
doc_type: api-contract
status: active
owner: backend-platform
created: 2026-06-07
updated: 2026-06-07
summary: Canonical API contract for vehicle, truck, and trailer marketplace listings and inquiries.
related_docs:
  - docs/context/product-context.md
  - docs/context/implementation-status.md
  - docs/contracts/api/fleet.md
source_of_truth: true
---

# Vehicle Marketplace API Contract

Monetization note: creating a draft listing is free. First publish to `PUBLISHED` consumes included listing quota first, then marketplace credits. Company owners spend company credits; job-seeker owners spend job-seeker credits. Edit/delete/restore and non-publish status changes do not auto-refund or re-charge.

## Scope

This contract defines authenticated endpoints under `/api/v1/vehicle-marketplace`.

Vehicle marketplace is a product-expansion surface for listing trucks, trailers, and vans for sale, rental, or lease. It does not change the MVP release verdict, which remains governed by `docs/release/*`.

## Roles

- `COMPANY_ADMIN`: can browse, create company-owned listings, manage own company listings, and manage received/sent inquiries.
- `COMPANY_DRIVER`: can browse published listings and visible inquiries only; cannot mutate listings or create inquiries.
- `JOB_SEEKER`: can browse, create user-owned standalone listings, manage own listings, create inquiries, and manage sent/received inquiries.

## Listing Object

Fields returned by listing endpoints include:

- `id`
- `ownerCompanyId`
- `ownerUserId`
- `vehicleId`
- `intent`: `SALE`, `RENTAL`, `LEASE`
- `sourceType`: `FLEET_VEHICLE`, `STANDALONE`
- `status`: `DRAFT`, `PUBLISHED`, `PAUSED`, `SOLD`, `RENTED`, `CLOSED`
- `title`, `description`
- `vehicleType`: `TRUCK`, `TRAILER`, `VAN`
- `bodyType`
- `brand`, `model`, `year`
- `countryCode`, `city`
- `priceAmount`, `currency`
- `capacityKg`, `volumeM3`
- `refrigerated`, `hazmatCertified`
- `imageUrlsJson`, `documentsJson`
- `deletedAt`, `createdAt`, `updatedAt`
- owner/vehicle summary objects when available

## Endpoints

### `GET /vehicle-marketplace`

Returns non-deleted `PUBLISHED` listings only.

Supported query filters:

- `q`
- `intent`
- `status`; values other than `PUBLISHED` return no public feed rows
- `sourceType`
- `vehicleType`
- `bodyType`
- `countryCode`
- `city`
- `brand`
- `model`
- `currency`
- `yearMin`, `yearMax`
- `priceMin`, `priceMax`
- `capacityMin`, `capacityMax`
- `refrigerated`
- `hazmatCertified`
- `page`, `pageSize`

Response:

- `data`: listing array
- `meta.pagination`: `{ page, pageSize, total }`

### `GET /vehicle-marketplace/mine`

Returns listings owned by the authenticated `COMPANY_ADMIN` company or authenticated `JOB_SEEKER`, including draft/paused/closed states. `COMPANY_DRIVER` receives `403`.

Supported query filters match the public list. Additional owner-only query:

- `includeDeleted=true` includes soft-deleted owned listings so restore actions can be shown.

### `GET /vehicle-marketplace/:listingId`

Returns a non-deleted listing when:

- listing is `PUBLISHED`, or
- requester owns the listing.

Unpublished non-owned and deleted listings return `404`.

### `POST /vehicle-marketplace`

Creates a listing.

Required body:

- `title`
- `intent`
- `sourceType`
- `vehicleType`
- `countryCode`
- `city`

Optional body:

- `description`
- `status`; defaults to `DRAFT`
- `vehicleId`; required for `FLEET_VEHICLE`, forbidden for `STANDALONE`
- `bodyType`, `brand`, `model`, `year`
- `priceAmount`, `currency`
- `capacityKg`, `volumeM3`
- `refrigerated`, `hazmatCertified`
- `imageUrlsJson`, `documentsJson`

Fleet-backed listing rules:

- source vehicle must be active and non-deleted.
- company admins can only list vehicles owned by their company.
- job seekers can only list user-owned vehicles.
- selected vehicle fields are copied as listing defaults where request values are omitted.

### `PATCH /vehicle-marketplace/:listingId`

Updates an owned, non-deleted listing. Ownership is required.

Mutable fields:

- `title`, `description`
- `intent`, `status`
- `vehicleType`, `bodyType`, `brand`, `model`, `year`
- `countryCode`, `city`
- `priceAmount`, `currency`
- `capacityKg`, `volumeM3`
- `refrigerated`, `hazmatCertified`
- `imageUrlsJson`, `documentsJson`

### `DELETE /vehicle-marketplace/:listingId`

Soft-deletes an owned listing.

### `POST /vehicle-marketplace/:listingId/restore`

Restores an owned soft-deleted listing.

## Inquiry Object

Fields returned by inquiry endpoints include:

- `id`
- `listingId`
- `senderUserId`
- `senderCompanyId`
- `message`
- `contactName`, `contactEmail`, `contactPhone`
- `status`: `OPEN`, `RESPONDED`, `CLOSED`
- `createdAt`, `updatedAt`
- sender/listing summary objects when available

## Inquiry Endpoints

### `POST /vehicle-marketplace/:listingId/inquiries`

Creates an inquiry on a non-deleted `PUBLISHED` listing.

Allowed roles:

- `COMPANY_ADMIN`
- `JOB_SEEKER`

Request body:

- `message` required
- `contactName`, `contactEmail`, `contactPhone` optional

Cannot inquire on own listing.

### `GET /vehicle-marketplace/inquiries`

Returns inquiries visible to the authenticated user:

- inquiries sent by the user
- inquiries sent by the user company
- inquiries received on listings owned by the user
- inquiries received on listings owned by the user company

Supported query:

- `status`
- `page`
- `pageSize`

Response:

- `data`: inquiry array
- `meta.pagination`: `{ page, pageSize, total }`

### `PATCH /vehicle-marketplace/inquiries/:inquiryId`

Updates inquiry status.

Rules:

- listing owners may set any valid status.
- inquiry senders may only set `CLOSED`.
- non-visible inquiries return `403` or `404` according to lookup result.

## Error Codes

Common errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `COMPANY_REQUIRED`
- `VALIDATION_ERROR`
- `VEHICLE_NOT_FOUND`
- `VEHICLE_MARKETPLACE_LISTING_NOT_FOUND`
- `VEHICLE_MARKETPLACE_LISTING_NOT_DELETED`
- `VEHICLE_MARKETPLACE_INQUIRY_NOT_FOUND`
- `CANNOT_INQUIRE_OWN_LISTING`

## Evidence

Integration coverage:

- `tests/integration/vehicleMarketplace.spec.ts`

## Changelog

- 2026-06-07: Created canonical vehicle marketplace contract with listing, filter, ownership, restore, and inquiry behavior.
