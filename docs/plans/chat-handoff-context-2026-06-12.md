# Cargo Agent Codex Handoff Context - 2026-06-12

Use this file to restart work in a fresh Codex session on another machine. It compresses the long chat history into actionable project memory.

## Workspace

- Root workspace: `C:\Users\Leonyx\Desktop\Cargo-Agent`
- Backend: `C:\Users\Leonyx\Desktop\Cargo-Agent\cargo-agent-backend`
- Frontend: `C:\Users\Leonyx\Desktop\Cargo-Agent\cargo-agent-frontend`
- Current task backlog: `C:\Users\Leonyx\Desktop\Cargo-Agent\tasks.md`
- Earlier handoff: `C:\Users\Leonyx\Desktop\Cargo-Agent\cargo-agent-backend\docs\plans\chat-handoff-context-2026-06-07.md`
- Important plan docs:
  - `C:\Users\Leonyx\Desktop\Cargo-Agent\cargo-agent-backend\docs\plans\backend-release-closure-next-plan.md`
  - `C:\Users\Leonyx\Desktop\Cargo-Agent\cargo-agent-backend\docs\plans\job-seeker-ui-and-vehicle-marketplace-plan.md`

## Communication And Work Style

The user wants step-by-step implementation with short updates, using the project docs and design skills:

- `frontend-design`
- `huashu-design`
- `ui-ux-pro-max`
- `web-design-guidelines`
- Stripe work should follow `stripe-best-practices`.

Default working style:

1. Read the existing implementation before editing.
2. Work one small batch at a time.
3. Update `tasks.md` when a task is completed.
4. Run focused tests first, then `npm run lint` and `npm run build` for frontend changes.
5. Keep UI compact, operational, and SaaS-like.
6. Avoid overly rounded controls and blue mouse-click focus rings.
7. Preserve accessible keyboard `focus-visible` states.
8. Do not mark release `GO` unless real evidence exists.

## Honest Project State

Cargo Agent is feature-rich and close to staging, but not release-ready.

Estimated current state:

- Backend feature surface: roughly 95-98% implemented for mounted MVP/product-expansion modules.
- Frontend product coverage: roughly 90-94% for company logistics, job seeker, billing/credits, vehicle marketplace, route marketplace, bids, and contracts.
- MVP staging readiness: roughly 70-80%.
- Release GO readiness: roughly 65-75%.

Main release gaps are proof/evidence and operational validation, not missing large modules:

- Manual UAT evidence is incomplete.
- CI branch protection proof is not attached.
- Stripe sandbox/replay evidence must be captured.
- Email provider is intentionally skipped for now, so delivery remains simulated or needs waiver.
- S3 production adapter is deferred; local upload works for dev/staging.
- Release docs should stay `NO-GO` until external evidence/signoff exists.

## Major Work Completed Across The Long Session

### Backend

Implemented or heavily expanded:

- Fleet operations: vehicles, licenses, assignments.
- Billing/subscriptions with Stripe sandbox direction.
- Company credits and job seeker credits.
- Job seeker wallet and credit pack flows.
- Job applications and job seeker profile support.
- Vehicle marketplace backend:
  - company and job seeker listing ownership,
  - listing CRUD,
  - marketplace filters,
  - inquiries,
  - image/document metadata support.
- Route marketplace privacy:
  - routes scoped by company,
  - legacy unscoped route protection.
- Geo/localization catalog endpoints:
  - languages,
  - countries,
  - cities.
- Route estimation via OpenRouteService when configured.
- Posts/bids/contracts lifecycle:
  - open posts visible cross-company,
  - other companies can bid,
  - bids workspace support,
  - contract lifecycle actions.
- Bid activity timeline.
- Contract timeline update endpoint.
- Auto contract creation when a bid is accepted.
- Post boosting and bid boosting with company credits.
- Notification event improvements for marketplace flows.
- BullMQ/Redis queue usage for webhook/notification style async work.
- Release/staging docs and scripts expanded.

Important backend principle:

- Release remains `NO-GO`; do not fabricate evidence.

### Frontend

Implemented or heavily expanded:

- ClickUp-style two-rail navigation shell.
- Route/location screens and route map/estimate work.
- Fleet pages: overview, vehicles, licenses, assignments.
- Documents, notifications, audit logs, reviews foundation.
- Billing page, company credits page, job wallet, checkout-result pages.
- Job seeker profile page with wallet/listing/profile context.
- Vehicle marketplace:
  - browse page,
  - detail page,
  - gallery/carousel direction,
  - listing create/edit,
  - owner mine page,
  - inquiries page.
- Route marketplace:
  - posts list/detail,
  - cross-company bid submission,
  - bids workspace,
  - contract detail/lifecycle.
- Notifications polish for marketplace links.
- Release readiness page.
- Protected route behavior and job seeker login redirect fix.
- Forgot password OTP flow.
- Shared upload controls in several places.

### Stripe And Payments

User created Stripe sandbox account and provided test publishable/secret keys in chat.

Security note:

- The pasted Stripe secret key should be rotated after local smoke testing because it was shared in chat.

Stripe setup explained:

- `STRIPE_SECRET_KEY` authenticates backend API calls to Stripe.
- `STRIPE_PUBLISHABLE_KEY` is safe for frontend/client-side Stripe use.
- `STRIPE_WEBHOOK_SECRET` (`whsec_...`) verifies that incoming webhook requests really came from Stripe CLI/dashboard endpoint.
- `stripe listen --forward-to http://localhost:4000/webhooks/stripe` is needed whenever testing local webhooks, because Stripe cannot directly call a localhost backend.
- In production/staging with a public URL, use Stripe Dashboard webhook endpoint instead of the local CLI listener.

### OpenRouteService

User provided an OpenRouteService basic API key in chat. It should be stored in backend env as:

```env
OPENROUTESERVICE_API_KEY=...
```

Use this for truck-aware route estimates and route geometry where supported. UI should show provider/source and keep manual distance/duration fallback if provider fails.

## Most Recent Completed Batch

The latest completed implementation batch was from `tasks.md`.

Batch 1: Login + OTP Quick Wins

Completed tasks:

- `B1`: Login page email/password inputs now have leading icons.
- `B2`: Login input focus styling was tightened to avoid blue mouse-click focus rings while preserving keyboard `focus-visible`.
- `B7`: Added shared split 6-digit OTP input:
  - paste support,
  - auto-advance,
  - backspace navigation,
  - used in login MFA, forgot password, registration OTP, and invite acceptance OTP.
- `B9`: Registration OTP card is visually centered.

Files changed in that batch:

- `cargo-agent-frontend/src/shared/components/ui/OtpCodeInput.tsx`
- `cargo-agent-frontend/src/features/auth/LoginPage.tsx`
- `cargo-agent-frontend/src/features/auth/ForgotPasswordPage.tsx`
- `cargo-agent-frontend/src/features/registration/RegistrationStartPage.tsx`
- `cargo-agent-frontend/src/features/invites/InviteAcceptPage.tsx`
- `cargo-agent-frontend/src/features/dashboard/DashboardPage.tsx`
- `tasks.md`

Verification passed:

```powershell
cd C:\Users\Leonyx\Desktop\Cargo-Agent\cargo-agent-frontend
npm run test -- --run
npm run test -- --run src/features/auth/auth.test.tsx
npm run lint
npm run build
```

Observed results:

- Full frontend tests passed: 105/105.
- Focused auth tests passed: 18/18.
- Lint passed.
- Build passed.

## Current UAT Task Backlog

Use `C:\Users\Leonyx\Desktop\Cargo-Agent\tasks.md` as the active step-by-step backlog.

Recommended order in that file:

1. Batch 1: Login + OTP Quick Wins - done.
2. Batch 2: Registration Design Decision - requires decisions before coding.
3. Batch 3: Notifications Page Polish.
4. Batch 4: Locations UX.
5. Batch 5: Routes Map/Layout.
6. Batch 6: Posts Navigation And Creation.

Important pending tasks from `tasks.md`:

- Registration redesign:
  - account type first,
  - compact 100vh layout,
  - step progress,
  - placeholders,
  - country dropdown,
  - phone prefix,
  - optional fields moved after login.
- Dashboard/header simplification:
  - role-specific dashboard,
  - wallet/credits in header,
  - profile/settings/change password access.
- Notifications:
  - better back button,
  - full-height list,
  - better pagination,
  - smaller toolbar.
- Locations:
  - country/city dependency bug,
  - success feedback,
  - max 5 rows with pagination,
  - delete confirmation,
  - hide coordinates,
  - icon actions.
- Routes/map:
  - verify whether map uses real road geometry or straight line,
  - fit bounds,
  - conditional map display,
  - route map modal or expandable panel.
- Posts:
  - split marketplace/my posts/create routes,
  - focused creation pages,
  - better form grid,
  - success popup and redirect.

## Open Product Decisions

Registration:

- Should company/job seeker choice be changeable after OTP?
- Which fields are absolutely required before account creation?
- Should optional profile fields move into post-login onboarding?
- Should incomplete accounts be blocked from marketplace actions or only warned?

Localization:

- Persist language preference in backend user profile or browser local storage first?

Routes:

- Map presentation: modal, expandable panel, or embedded creation-only map?

Posts:

- Should marketplace be under Posts or a top-level nav item?
- Redirect after post creation to post detail or My posts?

Deleted records:

- Per-module deleted tabs/pages or global Trash?

Dashboard:

- Top 5 KPIs for company users?
- Top 5 KPIs for job seekers?

## Recommended Next Work

Recommended next step depends on whether the user wants decisions or pure implementation.

Option A: decision-driven next batch

- Work on Batch 2 registration redesign.
- First decide required fields and layout direction.
- Then implement compact registration wizard.

Option B: implementation-only next batch

- Work on Batch 3 Notifications Page Polish.
- It is frontend-only and low-risk.
- Good next UAT slice.

My recommendation:

- Do Batch 3 next if the user wants momentum.
- Do Batch 2 next if the user is ready to make registration product decisions.

## Backend/Release Work Still Needed

Release hardening:

- Finish Stripe sandbox replay evidence.
- Attach Stripe test event IDs and duplicate-safety proof.
- Attach CI branch protection proof.
- Complete manual UAT screenshots/checklist.
- Decide email provider vs waiver for OTP/invites.
- Keep `go-no-go.md` as `NO-GO` until all proof exists.

Operational hardening:

- Move more cleanup jobs into BullMQ if needed.
- Validate Redis/BullMQ worker startup logs.
- Validate `/health/live` and `/health/ready`.
- Validate OpenRouteService in staging-like run.
- Decide production storage provider before implementing S3/R2 adapter.

## Development Rules For Next Codex Session

Follow these docs first:

- `cargo-agent-backend/docs/`
- `cargo-agent-frontend/docs/`
- `cargo-agent-backend/agent-rules/`
- `cargo-agent-frontend/docs/job-lane-frontend-gap-audit.md`
- `cargo-agent-backend/docs/plans/job-seeker-ui-and-vehicle-marketplace-plan.md`
- `tasks.md`

Implementation discipline:

- Use existing module patterns.
- Keep API response changes additive unless a contract bug is found.
- For frontend, use existing UI primitives unless a new shared component clearly pays off.
- Use restrained radii, compact spacing, readable status labels, no raw enum labels.
- Preserve keyboard accessibility.
- Use trace-ID-aware error UI.
- Run tests/lint/build after each slice.
- Update `tasks.md` status as tasks are completed.
- Do not revert unrelated changes.

## Paste-Ready Prompt For New Codex Session

Copy this into a new Codex chat on another machine:

```text
You are continuing work on Cargo Agent.

Workspace root: C:\Users\Leonyx\Desktop\Cargo-Agent

First read:
- cargo-agent-backend/docs/plans/chat-handoff-context-2026-06-12.md
- tasks.md
- cargo-agent-backend/docs/
- cargo-agent-frontend/docs/
- cargo-agent-backend/agent-rules/

Use these design skills and rules:
- frontend-design
- huashu-design
- ui-ux-pro-max
- web-design-guidelines
- stripe-best-practices for Stripe/billing work

Current task mode:
We are doing UAT frontend/UX polish batch by batch from tasks.md.
Batch 1 is already completed:
- B1 login icons
- B2 neutral focus/no blue mouse-click ring
- B7 shared split OTP input
- B9 centered registration OTP

Verification already passed after Batch 1:
- npm run test -- --run
- npm run test -- --run src/features/auth/auth.test.tsx
- npm run lint
- npm run build

Next choose one:
1. Batch 2 registration redesign, but ask/confirm decisions first.
2. Batch 3 notifications polish, which is frontend-only and implementation-ready.

Important project context:
- Backend feature surface is broad, around 95-98% for MVP/product-expansion modules.
- Frontend product coverage is around 90-94%.
- Release remains NO-GO because real UAT/CI/Stripe/delivery/signoff evidence is missing.
- Do not fabricate release evidence.
- Keep UI compact, operational, restrained, and accessible.
- Work in small slices, update tasks.md, and run focused tests plus lint/build.

Start by inspecting the current files for the selected batch, then implement the smallest complete slice.
```

## Codex Memory Transfer Note

There is no guaranteed portable "whole chat memory" file that automatically transfers between Codex installations unless the product/account provides synced memory/history. The reliable way to move working context between laptop and PC is:

1. Commit or copy the repository with docs and plan files.
2. Keep handoff files like this one in the repo.
3. Copy `tasks.md`.
4. Start the new Codex session with the paste-ready prompt above.
5. Ask the new session to read this handoff before coding.

If Codex has account-level chat history or memory sync enabled in the app, use that. Otherwise, project-local handoff docs are the safest and most explicit memory.
