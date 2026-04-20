---
title: <Release Runbook>
doc_type: release-runbook
status: <active|draft|archived>
owner: <release-owner>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
summary: <Executable release procedure and execution order.>
related_docs:
  - docs/release/mvp-readiness.md
  - docs/release/evidence-map.md
  - docs/release/uat-smoke-checklist.md
  - docs/release/go-no-go.md
source_of_truth: <true|false>
---

# <Release Runbook>

<!-- Procedure only. Do not duplicate blocker tables or decision history here. -->

## Procedure

1. <step>
2. <step>
3. <step>

## Stop/fail rule

- Stop release immediately if any required gate is `FAILED`.
- Stop release immediately if any required gate is not `PROVEN` at decision time.
- Stop release immediately if UAT result is `FAIL` or signoff is missing.

## Execution rules

- Do not skip gate order.
- Do not mark gate completion without linked evidence.
- Treat missing evidence as failure.

## Outputs

- Gate evidence complete in `docs/release/evidence-map.md`.
- UAT checklist complete in `docs/release/uat-smoke-checklist.md`.
- Verdict recorded in `docs/release/go-no-go.md`.
