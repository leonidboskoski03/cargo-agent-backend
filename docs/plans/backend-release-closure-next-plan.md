# Backend Release Closure Next Plan

## Summary

Backend MVP module coverage is effectively complete for the mounted `/api/v1` surface. Current release state is not blocked by missing core modules; it is blocked by external proof and final release governance.

Current estimate:

- Backend feature surface: 97-99% covered for MVP-mounted modules.
- Automated backend coverage: high for critical flows, with contract adoption now proven by `npm run test:evidence:contracts`.
- Release readiness: still `NO-GO` until manual/provider/CI/signoff evidence is attached.

## Key Changes

### Release Evidence Closure

- Complete the remaining release blockers:
  - `RB-001`: manual UAT completion.
  - `RB-002`: Product/QA/Ops signoff.
  - `RB-003`: Stripe webhook replay proof with real/staging Stripe event IDs.
  - `RB-004`: CI required-check and merge-block proof.
  - `RB-006`: production delivery-provider validation or explicit waiver.
- Keep `RB-005` closed/proven through:
  - `npm run test:evidence:contracts`
  - `docs/release/evidence/<date>/G-005-contract-adoption/manifest.json`

### Evidence Workflow

- Continue writing dated artifacts under `docs/release/evidence/<date>/...`.
- Use:
  - `npm run test:evidence:webhooks` for webhook replay/idempotency evidence.
  - `npm run test:evidence:contracts` for contract adoption evidence.
  - `scripts/release-smoke.ps1` for backend health and frontend direct-route smoke.
- Do not mark gates `PROVEN` without real external artifacts where required.

### Backend Hardening

- Keep API contracts stable unless tests expose a real mismatch.
- Add only release-supporting backend changes before GO:
  - Better evidence scripts.
  - Missing branch-specific tests for documented edge cases.
  - Trace-ID and provider-state clarity.
- Avoid starting large new backend modules until the remaining release gates are closed or explicitly deferred.

### Frontend Release Support

- Keep `/release-readiness` aligned with backend release gate state.
- Add links or labels for new evidence commands when useful.
- Keep direct-route smoke coverage current when new protected routes are added.

## Test Plan

- Backend:
  - `npm run ci:prisma`
  - `npm run build`
  - `npm run test:unit`
  - `npm run test:ci:integration`
  - `npm run test:release:ci`
  - `npm run test:evidence:webhooks`
  - `npm run test:evidence:contracts`
- Frontend:
  - `npm run test -- --run`
  - `npm run lint`
  - `npm run build`
- Smoke:
  - `powershell -ExecutionPolicy Bypass -File scripts/release-smoke.ps1`

## Assumptions

- “Full backend coverage” means full MVP release coverage, not every possible future product module.
- Release remains `NO-GO` until real UAT, signoff, Stripe event IDs, CI enforcement proof, and delivery-provider evidence exist.
- Vehicle marketplace and broader expansion work should be planned separately from release closure unless Product decides to expand MVP scope.
