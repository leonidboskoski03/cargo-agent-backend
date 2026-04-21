# [PARTIAL DONE] Sprint 3 - CI Baseline and Release Gates

- Status: [PARTIAL DONE]
- Updated at: 2026-04-17 11:29:49 +02:00

## What this is

Sprint 3 CI baseline ensures every PR is validated by build + tests + release smoke checks in a clean environment.

## What is implemented

- Added GitHub Actions workflow: `.github/workflows/ci.yml`.
- Workflow includes Postgres + Redis services.
- Workflow runs Prisma validation/generation, migration deploy, build, full tests, and release smoke suite.

## Why it matters

This reduces false-green local-only confidence and catches migration/runtime/test issues before merge.

## Remaining items

- Configure GitHub required checks in repository settings so failing CI blocks merges.
- Add evidence links to release-runbook gate checklist during real releases.

