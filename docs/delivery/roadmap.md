---
title: Delivery Roadmap
doc_type: roadmap
status: active
owner: backend-platform
created: 2026-04-20
updated: 2026-04-20
summary: Strategic delivery priorities ordered by release impact for MVP closeout.
related_docs:
  - docs/release/mvp-readiness.md
  - docs/delivery/sprints/sprint-001.md
  - docs/delivery/sprints/sprint-002.md
  - docs/delivery/sprints/sprint-003.md
  - docs/delivery/task-log.md
source_of_truth: true
---

# Delivery Roadmap

Strategic priorities only. Tactical execution lives in sprint files. Chronological history lives in `docs/delivery/task-log.md`.

## Active sprint mapping

- Priority 1 -> `docs/delivery/sprints/sprint-002.md`
- Priority 2 -> `docs/delivery/sprints/sprint-001.md`
- Priority 3 -> `docs/delivery/sprints/sprint-003.md`

## Now (ordered by release impact)

1. Complete money-path replay safety evidence (billing/webhook).
2. Complete manual UAT and cross-functional signoff.
3. Finalize billing/authz protected-route verification evidence.
4. Finalize CI required-check enforcement evidence.

## Next (ordered by release impact)

1. Harden release packet repeatability (evidence links, ownership, decision traceability).
2. Reduce active use of legacy root release/delivery docs.
3. Keep canonical contract discipline (`docs/contracts/api/*`) across all active docs.

## Later

1. Archive replaced legacy docs after all canonical references are stable.
2. Resume post-MVP capability expansion after release closure.

## Major risks

- Incomplete billing/webhook replay evidence causing money-path release risk.
- Incomplete manual UAT/signoff causing governance risk.
- Authorization/tenant-scope regressions if final protected-route verification is incomplete.
- Contract drift if deprecated root contract docs are treated as active source.

## Dependency notes

- Stable staging environment parity (API + worker + DB schema state).
- Stripe test webhook flow with retained replay artifacts.
- GitHub repo settings access for required-check enforcement evidence.
- Named Product/QA/Ops release approvers and signoff ownership.
