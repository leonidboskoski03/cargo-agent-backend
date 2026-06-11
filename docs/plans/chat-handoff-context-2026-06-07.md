# Cargo Agent Handoff Context - 2026-06-07

This file is a compact handoff for continuing the Cargo Agent work in a new Codex chat.

## Workspace

- Root workspace: `C:\Users\Leonyx\Desktop\Cargo-Agent`
- Backend: `cargo-agent-backend`
- Frontend: `cargo-agent-frontend`
- Backend dev URL: `http://localhost:4000/api/v1`
- Frontend dev URL: `http://localhost:5173`
- Current release stance: still `NO-GO` until real external evidence and signoff exist.

## Mandatory Reading For The Next Chat

Before implementing, read and follow:

- `cargo-agent-backend/docs/`
- `cargo-agent-frontend/docs/`
- `cargo-agent-backend/agent-rules/`
- `cargo-agent-frontend/docs/job-lane-frontend-gap-audit.md`
- `cargo-agent-backend/docs/plans/backend-release-closure-next-plan.md`
- `cargo-agent-backend/docs/plans/job-seeker-ui-and-vehicle-marketplace-plan.md`

If `cargo-agent-backend/agent-rules/` is missing in the local checkout, note that explicitly and continue using the backend/frontend docs as the source of truth.

## What We Achieved So Far

### Backend

The backend MVP surface is broad and mostly implemented. Mounted modules include auth, companies, users, invites, fleet, locations/routes, posts, bids, contracts, reviews, documents, notifications, audit logs, plans, subscriptions, billing, job applications, job seeker billing, geo, localization, delivery, uploads, release readiness, and webhooks.

Recent backend hardening added or improved:

- Release evidence helpers and repeatable scripts.
- Contract adoption audit support through `npm run test:evidence:contracts`.
- Webhook replay evidence support through `npm run test:evidence:webhooks`.
- Delivery status visibility for provider/fallback mode.
- Upload/storage support with local fallback and S3-compatible direction.
- Release documentation updates for proven contract adoption evidence.
- Route/privacy and support-module hardening from earlier sprints.

Backend verification was passing after the last implementation slice:

- `npm run ci:prisma`
- `npm run build`
- `npm run test:unit`
- `npm run test:ci:integration`
- `npm run test:release:ci`
- `npm run test:evidence:contracts`
- `npm run test:evidence:webhooks`

### Frontend

The company logistics frontend is now substantial:

- Fleet UI exists for overview, vehicles, licenses, and assignments.
- Billing sandbox UI exists.
- Notifications, documents, audit logs, reviews, dashboard summaries, release readiness, upload controls, and shell/navigation improvements were implemented.
- Locations/routes/posts/contracts flows were improved, including marketplace status labeling and operational actions.
- ClickUp-style shell/navigation work was started and polished across several iterations.

The latest implemented frontend slice added the first job-seeker lane UI:

- `/jobs`
- `/jobs/mine`
- `/jobs/new`
- `/jobs/:jobApplicationId`
- `/job-wallet`

Recent job-lane files included:

- `cargo-agent-frontend/src/features/jobs/JobsPage.tsx`
- `cargo-agent-frontend/src/features/jobs/NewJobPage.tsx`
- `cargo-agent-frontend/src/features/jobs/JobDetailPage.tsx`
- `cargo-agent-frontend/src/features/jobs/JobWalletPage.tsx`
- `cargo-agent-frontend/src/features/jobs/jobFormatters.ts`
- `cargo-agent-frontend/src/features/jobs/jobSchemas.ts`
- `cargo-agent-frontend/src/features/jobs/JobsPage.test.tsx`
- `cargo-agent-frontend/docs/job-lane-frontend-gap-audit.md`

Frontend verification was passing after the last implementation slice:

- `npm run test -- --run`
- `npm run lint`
- `npm run build`

The release smoke script was also extended to include job-lane routes:

- `/jobs`
- `/jobs/mine`
- `/job-wallet`

## Honest Progress Assessment

These numbers are estimates, not marketing:

- Backend MVP feature surface: about 97-99% for the currently mounted MVP modules.
- Backend automated critical-flow coverage: about 85-92%.
- Backend release readiness: about 75-85%, but still `NO-GO` because several gates require real-world evidence.
- Frontend company logistics and marketplace coverage: about 90-95%.
- Job-seeker UI coverage: about 55-65%. The first usable slice exists, but it is not a fully polished job-seeker product yet.
- Vehicle/truck/trailer marketplace: about 0-5%. The plan exists, but the real backend schema/routes/UI are not implemented yet.
- Overall product if vehicle marketplace and job-seeker lane are included: about 80-88%.

The backend is close to full MVP implementation, but the product is not release-complete because evidence, UAT, provider validation, and the vehicle marketplace are not done.

## Last Plans Not Fully Implemented

### `backend-release-closure-next-plan.md`

Path:

`cargo-agent-backend/docs/plans/backend-release-closure-next-plan.md`

Status:

- Partially implemented.
- Contract adoption evidence was improved.
- Evidence scripts exist.
- Release docs were improved where proof existed.
- Still not fully closed because external evidence is missing.

Remaining:

- Manual UAT evidence.
- Product/QA/Ops signoff.
- Real Stripe test event IDs and provider replay proof.
- CI branch-protection and failing-check merge-block proof.
- Production delivery-provider validation or explicit MVP waiver.
- Final `GO` update only after evidence is real.

### `job-seeker-ui-and-vehicle-marketplace-plan.md`

Path:

`cargo-agent-backend/docs/plans/job-seeker-ui-and-vehicle-marketplace-plan.md`

Status:

- Partially implemented.
- First job-seeker frontend slice was implemented.
- Vehicle marketplace remains essentially unimplemented.

Remaining:

- Backend vehicle marketplace schema, services, routes, permissions, filters, and tests.
- Frontend vehicle marketplace list/detail/create/manage/inquiry screens.
- Job-seeker UI hardening and lifecycle actions.
- Contract docs and coverage matrix updates for vehicle marketplace.
- Smoke and direct-route coverage for the new vehicle marketplace pages.

## Important Rules For The Next Chat

1. Read the docs before changing behavior.
2. Treat `cargo-agent-backend/docs/contracts/api/*` as canonical when contracts exist.
3. If a backend module is added or expanded, add or update its contract doc.
4. Do not fabricate release evidence. Keep `NO-GO` until screenshots, CI links, Stripe IDs, provider proof, and signoff actually exist.
5. Preserve existing API response shapes unless a documented contract mismatch requires a change.
6. Keep tenant privacy strict: company-owned data must not leak between companies.
7. Keep role access strict: admins mutate; drivers/job seekers only mutate where backend explicitly allows.
8. Use trace-ID errors in frontend error states.
9. Keep UI dense, operational, and SaaS-like. Avoid decorative marketing layouts.
10. Keep keyboard accessibility with `focus-visible`, but avoid loud mouse-click blue focus rings.
11. Use existing frontend patterns, route-level lazy loading, shared API modules, and existing design tokens.
12. Use `rg` for repo search.
13. Use `apply_patch` for manual edits.
14. Do not revert unrelated user changes.
15. Run backend and frontend checks after each meaningful slice.

## Skills And Design Direction To Follow

For frontend and full-stack work, the next Codex should use these skills as guidance:

- `frontend-design`: production-grade UI implementation, polished screens, restrained but high-quality layout.
- `ui-ux-pro-max`: form, table, dashboard, navigation, accessibility, and interaction quality.
- `web-design-guidelines`: accessibility and UX review before finalizing.
- `huashu-design`: light interaction polish for the ClickUp-style shell, hover panels, animated secondary navigation, and prototype-level thinking. Do not use it as an excuse for decorative bloat.

Design principles:

- Dense operational SaaS UI.
- Compact controls with restrained radius.
- Good tables and filters.
- Clear empty/loading/error states.
- Clear role visibility.
- No raw enum labels such as `PENDING_REVIEW`; map them to readable text.
- No fake readiness states.

## Recommended Next Implementation Plan

### Phase 1 - Vehicle Marketplace Backend

Implement the missing vehicle/truck/trailer marketplace as the next major slice.

Suggested backend scope:

- Add Prisma models for vehicle marketplace listings and inquiries.
- Support listing source types:
  - Fleet-backed company vehicle.
  - Standalone marketplace listing.
- Support listing intent:
  - Sale.
  - Rental.
  - Lease if useful and already compatible with product language.
- Support listing asset categories:
  - Truck.
  - Trailer.
  - Van or other existing vehicle types if already in backend enums.
- Add listing fields:
  - title
  - description
  - vehicleType
  - bodyType
  - brand
  - model
  - year
  - plate or VIN where appropriate
  - countryCode
  - city
  - priceAmount
  - currency
  - capacityKg
  - volumeM3
  - refrigerated
  - hazmat
  - status
  - images/documents metadata
- Add full filtering:
  - intent
  - status
  - sourceType
  - vehicleType
  - bodyType
  - countryCode
  - city
  - brand
  - model
  - yearMin/yearMax
  - priceMin/priceMax
  - currency
  - capacityMin/capacityMax
  - refrigerated
  - hazmat
  - q keyword search
- Add endpoints under `/api/v1/vehicle-marketplace`.
- Add inquiry workflow for interested companies/job seekers.
- Add tenant-safe permissions and tests.
- Add `docs/contracts/api/vehicle-marketplace.md`.
- Add the module to the backend coverage matrix and contract audit.

Backend verification after this phase:

- `npm run ci:prisma`
- `npm run build`
- `npm run test:unit`
- `npm run test:ci:integration`
- `npm run test:release:ci`
- `npm run test:evidence:contracts`

### Phase 2 - Vehicle Marketplace Frontend

Build the UI for the marketplace after the backend contract is stable.

Suggested routes:

- `/vehicle-marketplace`
- `/vehicle-marketplace/new`
- `/vehicle-marketplace/:listingId`
- `/vehicle-marketplace/mine`
- `/vehicle-marketplace/inquiries`

UI requirements:

- Dense filter panel.
- Listing table/grid suitable for trucks and trailers.
- Detail page with image/document metadata.
- Create/edit form with catalog-backed country/currency fields.
- Admin and owner-only mutation controls.
- Inquiry form and inquiry management.
- Direct-route-safe lazy pages.
- Shell navigation item under marketplace or fleet, depending on existing IA.

Frontend verification after this phase:

- `npm run test -- --run`
- `npm run lint`
- `npm run build`

### Phase 3 - Job-Seeker UI Hardening

After vehicle marketplace foundation:

- Add missing job application lifecycle actions if backend supports them.
- Add edit/delete/status flows if contracts exist or backend is extended.
- Improve `/jobs/:jobApplicationId` once backend has a true detail endpoint.
- Improve `/job-wallet` checkout return/cancel states.
- Add more role-specific tests.
- Update `cargo-agent-frontend/docs/job-lane-frontend-gap-audit.md`.

### Phase 4 - Release Evidence Closure

Do this in parallel only when real proof can be collected.

Required evidence:

- Manual UAT screenshots.
- Product/QA/Ops approval.
- Stripe test event IDs and duplicate replay proof.
- CI branch protection and failing-check merge-block proof.
- Delivery provider proof for OTP and invites, or explicit waiver.
- Health/readiness screenshots or logs.

Only then update:

- `cargo-agent-backend/docs/release/go-no-go.md`
- `cargo-agent-backend/docs/release/mvp-readiness.md`
- `cargo-agent-backend/docs/release/evidence-map.md`

## Pasteable Prompt For The Next Codex Chat

Use this prompt in the next chat:

```text
You are Codex working in C:\Users\Leonyx\Desktop\Cargo-Agent.

Before implementing, read and follow:
- cargo-agent-backend/docs/
- cargo-agent-frontend/docs/
- cargo-agent-backend/agent-rules/
- cargo-agent-frontend/docs/job-lane-frontend-gap-audit.md
- cargo-agent-backend/docs/plans/backend-release-closure-next-plan.md
- cargo-agent-backend/docs/plans/job-seeker-ui-and-vehicle-marketplace-plan.md
- cargo-agent-backend/docs/plans/chat-handoff-context-2026-06-07.md

Use the frontend-design, ui-ux-pro-max, web-design-guidelines, and light huashu-design guidance for frontend work. Keep the UI dense, operational, accessible, role-aware, and consistent with DESIGN/docs. Use existing patterns. Do not fabricate release evidence. Do not revert unrelated changes.

Goal: continue from the handoff. The backend MVP is close to complete, but vehicle/truck/trailer marketplace is not implemented and release remains NO-GO due to missing real evidence. Start with the Vehicle Marketplace Backend phase from the handoff: schema, services, routes, filters, permissions, tests, contract docs, and coverage matrix. Then implement the frontend marketplace routes and tests. Run the required backend and frontend checks after each slice.
```

## Final Honest Note

The project is in a strong state, but it is not finished. The next meaningful work is not another small polish pass. It is the vehicle marketplace as a real backend and frontend feature, followed by job-seeker hardening and honest release evidence collection. The release should stay `NO-GO` until real artifacts exist.
