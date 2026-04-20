# UAT Smoke Checklist (MVP)

Last updated: 2026-04-17 12:18:57 +02:00
Status: [PARTIAL DONE]
Owner: Product + Backend + QA

Use this checklist during staging/UAT before every MVP release.
Attach evidence links for every scenario (screenshots, response payloads, logs, Stripe event IDs).

## A) Environment readiness

- [ ] Staging API is reachable.
- [ ] Staging worker process is running when `BULLMQ_ENABLED=true`.
- [ ] DB migrations and seed were applied for staging snapshot.
- [ ] Stripe test mode keys/webhook are configured.

Evidence:
- `docs/release-evidence-2026-04-17.md`

## B) Auth and account flows

- [x] Register as `JOB_SEEKER` via registration wizard flow.
- [x] Register company admin via company registration wizard flow.
- [x] Login + refresh + logout for both lanes.
- [x] OTP request/verify/resend edge behavior is user-visible and deterministic.
- [x] Forgot/reset password flow works and old sessions are invalidated.

Evidence:
- `docs/release-evidence-2026-04-17.md` (automated integration evidence)

## C) Company invite flow

- [x] Company admin creates invite.
- [x] Invite accept works only for intended user/email.
- [x] Expired/revoked/used invite paths are blocked with expected errors.

Evidence:
- `docs/release-evidence-2026-04-17.md` (via `marketplaceEndToEnd` + auth/invite hardening suites)

## D) Logistics marketplace lane

- [x] Company creates post.
- [x] Another company submits bid.
- [x] Bid accept creates contract once.
- [ ] Contract lifecycle update path works.
- [ ] Review creation allowed only after valid contract lifecycle condition.

Evidence:
- `docs/release-evidence-2026-04-17.md`

## E) Job seeker lane

- [x] Company creates driver job listing (`JobApplication`).
- [x] `JOB_SEEKER` applies (`JobApplicationSubmission`).
- [ ] Submission uniqueness and role constraints are enforced.
- [ ] Billing metadata is returned on apply response.

Evidence:
- `docs/release-evidence-2026-04-17.md`

## F) Billing and webhooks

- [ ] Company subscription checkout flow works in test mode.
- [x] `checkout.session.completed` for job seeker credits grants credits exactly once.
- [x] Replay same webhook event does not duplicate subscription or credits.
- [ ] Billing events are visible in company billing history endpoint.

Evidence:
- `docs/release-evidence-2026-04-17.md`

## G) Notifications and documents (if in release scope)

- [ ] Notification list + mark-read + mark-all-read works within scope.
- [ ] Document CRUD + scope constraints work for owner context.

Evidence:
- Pending manual UAT evidence (Postman/screenshots)

## H) Final UAT signoff

- [ ] Product signoff
- [x] Backend signoff
- [ ] QA signoff

Decision:
- [ ] PASS
- [x] FAIL

Date:
- 2026-04-17

Notes:
- Automated backend checks are green; remaining items are staging/manual/UAT signoff checks.

