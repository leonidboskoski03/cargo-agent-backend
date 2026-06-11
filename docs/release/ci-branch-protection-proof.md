---
title: CI Branch Protection Proof
doc_type: release-evidence-guide
status: active
owner: ops-backend
created: 2026-06-08
updated: 2026-06-08
summary: Evidence checklist for proving CI required checks and blocked merge behavior.
related_docs:
  - docs/release/evidence-map.md
  - docs/release/mvp-readiness.md
  - .github/workflows/ci.yml
source_of_truth: false
---

# CI Branch Protection Proof

This file describes the proof needed for `RB-004`. It is not proof by itself because branch protection is configured in GitHub repository settings.

## Required checks to prove

Capture screenshots or stable links showing that branch protection requires:

- Backend CI workflow on pull requests.
- Prisma schema validation/generation.
- Database migration deploy against the active split schema path: `prisma/schema`.
- Backend build.
- Unit tests.
- Integration tests.

## Blocked merge proof

Capture one failed-check pull request or branch protection test where:

- a required check fails,
- GitHub marks the pull request as blocked from merge,
- the blocked state is visible in the merge box or branch protection UI.

## Successful run proof

Capture the latest successful run link after the CI workflow is green.

Recommended command evidence to attach alongside the GitHub link:

```powershell
npm run ci:prisma
npm run build
npm run test:unit
npm run test:ci:integration
npm run test:release:ci
```

## Current code readiness

The backend CI workflow uses the active split Prisma schema path:

```text
npx prisma migrate deploy --schema prisma/schema
```

This removes the stale `prisma/schema.prisma` workflow mismatch, but `RB-004` remains `NOT READY` until GitHub branch protection screenshots/links are attached.

