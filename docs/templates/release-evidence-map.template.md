---
title: <Release Evidence Map>
doc_type: release-evidence-map
status: <active|draft|archived>
owner: <release-owner>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
summary: <Table-driven mapping of release gates to proof artifacts and pass criteria.>
related_docs:
  - docs/release/mvp-readiness.md
  - docs/release/runbook.md
  - docs/release/uat-smoke-checklist.md
  - docs/release/go-no-go.md
source_of_truth: <true|false>
---

# <Release Evidence Map>

<!-- Evidence map only. Do not store verdict history here. -->

Allowed status values: `NOT STARTED`, `PARTIAL`, `PROVEN`, `FAILED`.

| Gate ID | Gate / Check | Owner | Current status | Execution action | Pass criteria | Evidence required | Blocker ref |
|---|---|---|---|---|---|---|---|
| G-001 | <gate> | <owner> | <NOT STARTED|PARTIAL|PROVEN|FAILED> | <action> | <pass criteria> | <artifact requirements> | RB-001 |

## Evidence recording format

- Use stable evidence names with date and gate ID.
- Link each artifact directly from the row.
- Mark gate `FAILED` when evidence is missing or invalid.

## Notes

- Gate status is evaluated through `docs/release/runbook.md`.
- Final verdict is recorded only in `docs/release/go-no-go.md`.
