# 90 - Anti-Drift

Guardrails to prevent silent scope and truth drift.

- Do not use `docs/archive/*` as primary implementation input.
- Do not keep alternate rule systems outside canonical docs + this loader layer.
- For domain/auth/billing/contract-breaking changes: stop and surface decision before implementation.
- Record known contract/code mismatches explicitly; do not hide them in silent edits.
- Keep this folder pointer-based; detailed guidance belongs in canonical docs.

