---
title: Release Runbook
doc_type: release-runbook
status: active
owner: release-owner
created: 2026-04-20
updated: 2026-06-07
summary: Executable release procedure and execution order for MVP release operations.
related_docs:
  - docs/release/mvp-readiness.md
  - docs/release/evidence-map.md
  - docs/release/uat-smoke-checklist.md
  - docs/release/go-no-go.md
source_of_truth: true
---

# Release Runbook

Use this file for execution order only.
Use `docs/release/evidence-map.md` for evidence requirements, `docs/release/uat-smoke-checklist.md` for manual validation, and `docs/release/go-no-go.md` for verdict logging.

## Procedure

1. Confirm release window and assign release operator.
2. Open `docs/release/mvp-readiness.md` and confirm current blockers.
3. Execute all gates in `docs/release/evidence-map.md` in listed order.
4. For each gate, set `Current status` in the evidence map (`NOT STARTED`/`PARTIAL`/`PROVEN`/`FAILED`) and attach required evidence links.
5. Execute manual validation in `docs/release/uat-smoke-checklist.md`.
6. Record UAT result and approver signoffs in the UAT checklist.
7. Execute operational smoke checks in UAT (`UAT-OPS-004` through `UAT-OPS-007`) and attach endpoint/log artifacts.
8. Execute delivery-mode review for OTP/invite outbound paths (gate `G-006`) and attach either waiver or provider-validation evidence.
9. Re-open `docs/release/mvp-readiness.md` and confirm each blocker status using evidence.
10. Conduct release decision review with Product, QA, Ops, and Backend owners.
11. Record final verdict in `docs/release/go-no-go.md`.
12. If verdict is `GO`, execute deployment/release cutover per environment procedure.
13. If verdict is `NO-GO`, stop release and record explicit rollback/defer action in `docs/release/go-no-go.md`.

## Stop/fail rule

- Stop release immediately if any gate in `docs/release/evidence-map.md` is `FAILED`.
- Stop release immediately if any required gate is not `PROVEN` at decision time.
- Stop release immediately if UAT result is `FAIL` or required signoff is missing.
- Stop release immediately if gate `G-006` has no explicit waiver or provider-validation evidence.

## Execution rules

- Do not skip gate order.
- Do not mark any gate complete without linked evidence.
- Do not issue `GO` while any blocker is `NOT READY` in `docs/release/mvp-readiness.md`.
- Treat missing evidence as failure.
- Do not treat simulated OTP/placeholder invite delivery as implicitly accepted; explicit decision evidence is required.
- Do not treat `/health/live` as dependency readiness; rely on `/health/ready` evidence and worker logs for operational readiness.
- Do not mark cron coverage as complete unless placeholders are explicitly acknowledged as MVP-accepted or replaced by real jobs.

## Outputs

- Gate evidence: `docs/release/evidence-map.md` artifacts linked and complete.
- Manual validation: `docs/release/uat-smoke-checklist.md` signed and finalized.
- Decision history: `docs/release/go-no-go.md` updated with timestamped verdict.

## Automation Helpers

- `npm run test:evidence:webhooks` writes replay/idempotency output to `docs/release/evidence/<date>/G-003-webhook-replay/`.
- `npm run test:evidence:contracts` writes contract adoption output to `docs/release/evidence/<date>/G-005-contract-adoption/`.
- `powershell -ExecutionPolicy Bypass -File scripts/release-smoke.ps1` checks backend health and frontend direct routes, then writes `docs/release/evidence/<date>/G-001-uat-smoke/release-smoke.json`.
- These helpers support evidence collection only. They do not replace manual UAT screenshots, Product/QA/Ops signoff, real Stripe event IDs, or CI branch-protection proof.
