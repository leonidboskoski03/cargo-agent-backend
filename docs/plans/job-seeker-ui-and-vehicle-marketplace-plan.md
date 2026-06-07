# Job-Seeker UI Completion And Hybrid Vehicle Marketplace Plan

## Summary

Current coverage read:

- Backend MVP surface is about 97-99% covered for mounted modules and release evidence automation.
- Job-seeker backend is implemented: job applications, submissions, promotions, wallet, usage, credit packs, checkout sessions, transactions, and webhook idempotency.
- Job-seeker frontend first slice is implemented: job feed, my listings, create listing, detail/apply/submissions, wallet, credit packs, transactions, and role-aware navigation.
- Fleet vehicles backend/UI exist as an internal company registry, but a public vehicle marketplace for trucks/trailers is not implemented.

Next sprint should add a hybrid truck/trailer marketplace with sale + rental listings and inquiry flow, then return to job-seeker edit/status/delete hardening if needed.

## Implementation Progress

- 2026-06-07: Completed first job-seeker frontend slice using existing backend APIs.
- Added direct routes: `/jobs`, `/jobs/mine`, `/jobs/new`, `/jobs/:jobApplicationId`, `/job-wallet`.
- Added role-aware shell visibility so `JOB_SEEKER` users see Jobs/Wallet and do not see company-only fleet/company admin areas.
- Corrected frontend job-seeker API wrappers to match backend request/response shapes.
- Updated `scripts/release-smoke.ps1` to include job direct routes.

## Key Changes

### Job-Seeker Frontend Completion

- Completed first shell lane without exposing unfinished company-admin tools:
  - `/jobs`: browse company-created job listings.
  - `/jobs/mine`: manage own job-seeker listings.
  - `/jobs/new`: create a job-seeker listing.
  - `/jobs/:jobApplicationId`: detail, apply, submissions where allowed.
  - `/job-wallet`: wallet, usage, credit packs, transactions, checkout actions.
- Use existing backend APIs:
  - `/job-applications`
  - `/job-applications/mine`
  - `/job-applications/:id/apply`
  - `/job-applications/:id/promote`
  - `/job-applications/:id/submissions`
  - `/job-seeker-billing/*`
- Add role-aware navigation:
  - `JOB_SEEKER` sees Jobs and Wallet.
  - Company admins/drivers can browse job-seeker-created listings and apply/respond where backend allows.
  - Company-only fleet/billing/admin links stay hidden from job seekers.
- Add UI states for free quota, credit spend, insufficient credits, provider-not-configured checkout errors, trace IDs, and promoted listings.
- Remaining job-seeker hardening for a future pass:
  - Edit/status/delete listing flows if backend endpoints are extended.
  - Dedicated checkout return page if Stripe provider is configured.
  - More granular tests for detail/apply/wallet pages.

### Hybrid Truck/Trailer Marketplace Backend

- Add new backend module under `/api/v1/vehicle-marketplace`.
- Add Prisma-backed listing and inquiry models:
  - Listing can reference an existing `Vehicle` or be standalone.
  - Listing supports `TRUCK` and `TRAILER`.
  - Listing intent supports `SALE` and `RENTAL`.
  - Publisher can be `COMPANY_ADMIN` with company context or `JOB_SEEKER` as an independent owner.
  - Inquiry stores listing ID, requester user/company, message, optional contact fields, and status.
- Add endpoints:
  - `GET /vehicle-marketplace/listings`
  - `GET /vehicle-marketplace/listings/:listingId`
  - `POST /vehicle-marketplace/listings`
  - `PATCH /vehicle-marketplace/listings/:listingId`
  - `PATCH /vehicle-marketplace/listings/:listingId/status`
  - `DELETE /vehicle-marketplace/listings/:listingId`
  - `POST /vehicle-marketplace/listings/:listingId/restore`
  - `POST /vehicle-marketplace/listings/:listingId/inquiries`
  - `GET /vehicle-marketplace/inquiries`
  - `PATCH /vehicle-marketplace/inquiries/:inquiryId/status`
- Filtering must include:
  - listing intent, vehicle type, body type, country, city, brand, model, year min/max, price min/max, currency, capacity min/max, refrigerated, hazmat, active/promoted status, source type fleet/standalone, and keyword search.
- Authorization:
  - Listing owner can mutate own listings.
  - Company drivers are read-only.
  - Job seekers can publish standalone listings and inquire.
  - Company admins can publish standalone listings or publish selected company fleet vehicles.
  - Cross-tenant mutation is forbidden.

### Vehicle Marketplace Frontend

- Add pages:
  - `/vehicle-marketplace`: searchable marketplace grid/table.
  - `/vehicle-marketplace/new`: create standalone or fleet-based listing.
  - `/vehicle-marketplace/:listingId`: detail page with inquiry form.
  - `/vehicle-marketplace/mine`: publisher listing management.
  - `/vehicle-marketplace/inquiries`: received/sent inquiry management.
- Add dense SaaS filters with compact controls, not marketing layout.
- Reuse existing upload/document metadata controls for images and vehicle documents.
- Fleet-based listing flow:
  - Company admin chooses an existing fleet vehicle, then fills marketplace-specific price, intent, location, description, and availability.
- Standalone listing flow:
  - Publisher enters truck/trailer details directly without creating a fleet vehicle first.

### Contracts, Docs, And Release Evidence

- Add canonical API contract:
  - `docs/contracts/api/vehicle-marketplace.md`
- Update backend coverage matrix and contract evidence audit to include vehicle marketplace.
- Update frontend roadmap and job-lane gap audit:
  - Job seeker UI moves from deferred to implemented.
  - Vehicle marketplace becomes the next expansion lane.
- Keep release verdict `NO-GO` until external UAT/signoff/Stripe/CI/delivery evidence is attached.

## Test Plan

- Backend:
  - Add integration tests for job-seeker UI-backed flows if any contract mismatch is found.
  - Add vehicle marketplace tests for create/list/detail/update/status/delete/restore.
  - Add filter tests for vehicle type, intent, country/city, price range, body type, capacity, refrigerated/hazmat, and keyword search.
  - Add authorization tests for company admin, company driver, job seeker, and cross-tenant access.
  - Add inquiry tests for create/list/status and owner/requester visibility.
  - Run `npm run ci:prisma`, `npm run build`, `npm run test:unit`, `npm run test:ci:integration`, `npm run test:release:ci`, `npm run test:evidence:contracts`.
- Frontend:
  - Test job seeker route visibility, wallet rendering, credit pack checkout errors, listing create/apply/promote flows, and role-based action hiding.
  - Test vehicle marketplace filters, fleet-based vs standalone create paths, inquiry submission, and owner-only mutation controls.
  - Test direct links for `/jobs`, `/jobs/mine`, `/job-wallet`, `/vehicle-marketplace`, `/vehicle-marketplace/mine`, and listing detail pages.
  - Run `npm run test -- --run`, `npm run lint`, and `npm run build`.

## Assumptions

- Job-seeker UI is the next priority before vehicle marketplace implementation.
- Vehicle marketplace uses the selected hybrid model: fleet-backed listings plus standalone listings.
- First vehicle marketplace transaction model is listing + inquiry only, not offers/contracts/payments.
- Vehicle listing intent supports sale + rental from the first implementation.
- Company admins and job seekers can publish listings; company drivers are read-only.
- Existing fleet registry remains internal operations; publishing to marketplace is an explicit separate action.
