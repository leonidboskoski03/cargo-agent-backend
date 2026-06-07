---
title: Cargo Agent MVP Readiness
doc_type: mvp-readiness
status: active
owner: release-owner
created: 2026-04-19
updated: 2026-06-07
summary: Canonical GO/NO-GO decision file for MVP release readiness.
related_docs:
  - docs/context/implementation-status.md
  - docs/release/uat-smoke-checklist.md
  - docs/release/go-no-go.md
  - docs/release/evidence-map.md
  - docs/release/runbook.md
source_of_truth: true
---

# MVP Readiness

## 1) Executive verdict

- Verdict: `NO-GO`
- Can we ship now: `NO`
- Rule applied: any unproven release requirement is `NOT READY`.

## 2) Blocking items table

| ID | Blocker | Severity | Owner | Status | Evidence needed |
|---|---|---|---|---|---|
| RB-001 | Manual UAT completion is incomplete | Critical | TBD | NOT READY | Completed `docs/release/uat-smoke-checklist.md` with all required checks marked complete and linked artifacts |
| RB-002 | Final Product/QA/Ops signoff is missing | Critical | TBD | NOT READY | Named approvers and explicit signoff entries in release review records |
| RB-003 | Billing/webhook replay evidence is incomplete | Critical | TBD | NOT READY | Replay proof bundle with Stripe event IDs and no-duplicate mutation evidence |
| RB-004 | CI required-check proof and enforcement validation is incomplete | High | TBD | NOT READY | Branch protection proof (required checks active) and failing-check blocks-merge validation artifact |
| RB-005 | Contract source-of-truth adoption verification is complete | High | Backend | READY | `npm run test:evidence:contracts` passed and wrote `docs/release/evidence/2026-06-07/G-005-contract-adoption/manifest.json` |
| RB-006 | Auth/invite outbound delivery mode is unresolved for production policy | Critical | Product/Ops/Security (TBD) | NOT READY | Explicit decision record that either (A) simulated OTP + placeholder invite email are accepted for MVP with risk waiver, or (B) production providers are enabled and validated with evidence |

## 3) Exit criteria for GO

All criteria must be true:

- `RB-001` through `RB-006` are closed with linked evidence. `RB-005` is currently ready; all other blockers remain open.
- UAT checklist is complete and marked PASS.
- Product, QA, Ops, and Backend signoff are recorded.
- Billing/webhook replay scenarios are proven with artifact links.
- CI required checks are proven enforced for merge control.
- Contract source-of-truth adoption verification is proven.
- OTP/invite delivery mode decision is explicit and evidenced (waiver or production-provider validation).

## 4) Release risks

- Money-path duplication risk if replay evidence remains incomplete.
- Authz/tenant-scope regression risk if partial controls are released without final validation.
- Governance risk if shipping occurs without cross-functional signoff.
- Contract drift risk is reduced by `npm run test:evidence:contracts`; rerun it whenever backend contracts or mounted routes change.
- Release-governance risk if surfaced contract/code mismatches remain undocumented in accept/fix decisions.
- Account-recovery/onboarding reliability risk if simulated OTP and placeholder invite delivery are shipped without explicit business acceptance.

## 5) Evidence status

- Automated backend evidence: `AVAILABLE`.
- Manual UAT evidence: `INCOMPLETE`.
- Cross-functional signoff evidence: `MISSING`.
- Billing/webhook replay artifact completeness: `PARTIAL` automated command writes dated evidence manifests; real Stripe/staging event IDs remain incomplete.
- CI enforcement proof artifacts: `INCOMPLETE`.
- Contract source-of-truth adoption evidence: `PROVEN` by `npm run test:evidence:contracts`.
- OTP/invite outbound delivery evidence or waiver: `PARTIAL` provider-backed adapter and admin readiness UI exist; configured provider validation evidence is still missing.

## 6) Dependencies and open decisions

Dependencies:

- Stable staging environment with API + worker + DB parity.
- Stripe test webhook flow with retained event/replay artifacts.
- Repository settings access for branch protection evidence capture.

Open decisions:

- Final owner assignments for Product/QA/Ops release approvals.
- MVP policy decision on delivery mode:
  - Option A: accept simulated OTP + placeholder invite delivery for MVP with signed risk waiver.
  - Option B: require production email/SMS provider cutover before GO.

## 7) Changelog

- 2026-04-19: Initial canonical release-readiness decision file created. Verdict set to `NO-GO` based on unresolved blockers in `docs/context/implementation-status.md`.
- 2026-04-20: RB-005 wording aligned to contract source-of-truth adoption verification after contract normalization.
- 2026-04-20: RB-005 evidence expectation tightened to require module-level canonical contract linkage and mismatch triage state.
- 2026-04-20: Added `RB-006` to explicitly gate MVP on OTP/invite delivery-mode acceptance or provider cutover evidence.
- 2026-06-07: Closed `RB-005` as `READY` after adding `npm run test:evidence:contracts` and storing the G-005 contract adoption artifact.
