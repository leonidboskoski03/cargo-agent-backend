# Cargo Agent Docs Operating Guide

This is the canonical docs operating guide for Cargo Agent backend development.

`docs/README.md` is process truth, not product truth.
Use it to govern reading order, ownership, and update discipline.

## 1) Purpose of the docs system

The docs system exists to keep product scope, API behavior, delivery execution, and release safety aligned while we build a B2B logistics marketplace for the Balkans.

It must let any engineer or coding agent answer quickly:

- what Cargo Agent is and what MVP includes
- what behavior is implemented vs partial
- what API contracts are trusted (auth, invites, billing/subscriptions, job seeker billing, job applications)
- what sprint/release work is active
- whether release gates, observability, and UAT are ready

## 2) Folder map and meaning

### Active structure

- `docs/context/` - Product/domain/system context and implementation status.
- `docs/contracts/api/` - Canonical API contracts (primary source for endpoint behavior).
- `docs/delivery/` - Roadmap, sprint execution, task history.
- `docs/release/` - MVP readiness, runbook, evidence map, UAT, go/no-go.
- `docs/templates/` - Reusable templates for consistent docs-as-code updates.
- `docs/archive/` - Historical docs only.

### Archived legacy sources

- Legacy contract docs are archived under `docs/archive/2026/contracts/`.
- Legacy tracking snapshots are retained under `docs/archive/2026/tracking/`.
- Legacy release/context superseded files are retained under `docs/archive/2026/release/` and `docs/archive/2026/context/`.

Contract migration is complete. `docs/contracts/api/*` is the canonical source for API behavior.

## 3) Reading order for AI agents

Read in this order before implementation:

1. `docs/README.md`
2. `docs/context/product-context.md`
   - For post-MVP strategy only: `docs/context/platform-evolution.md`
3. `docs/context/implementation-status.md`
4. `docs/context/architecture.md`
5. `docs/contracts/api/*` for endpoint behavior (auth, company invites, company billing/subscriptions, job seeker billing, job applications)
6. Delivery docs for active work (`docs/delivery/roadmap.md` + active sprint file)
7. Release docs for shipping-sensitive work (auth, billing/subscriptions, webhooks, invites, sessions, OTP, observability, UAT)

`docs/context/product-context.md` is product/domain truth.
`docs/contracts/api/*` is the highest-trust source for endpoint behavior.
`docs/archive/` is never read first.

## 4) Source-of-truth precedence rules

When docs overlap, apply this order:

1. Matching file in `docs/contracts/api/*` for endpoint behavior and error semantics.
2. Release docs for shipping risk, evidence, and go/no-go decisions.
3. Context docs for product/domain meaning and constraints.
4. Delivery docs for execution order and sprint planning.
5. Tracking docs for historical progress snapshots.
6. Archive docs only when an active document explicitly references them.

Conflict resolution protocol:

1. Do not implement from conflicting docs.
2. Treat higher-precedence doc as authoritative.
3. Update lower-precedence doc in the same PR.
4. If conflict exists at the same precedence, block merge until owner resolves and records a decision note.

## AI agent behavior expectations

- Load docs in the defined order before proposing code edits.
- Treat `docs/contracts/api/*` as canonical for endpoint behavior.
- Treat archived legacy contract docs under `docs/archive/2026/contracts/` as historical references only.
- Do not treat archive docs as implementation input unless explicitly referenced by active docs.
- If endpoint behavior changes, update the matching contract doc in the same change.
- If release risk changes, update relevant release docs in the same change.
- Raise explicit risk notes when auth/billing/webhook/session/OTP/invite-sensitive behavior is touched.

## 5) Update rules after implementation work

After every meaningful backend change:

- If endpoint behavior changed, update the relevant file in `docs/contracts/api/*`.
- If scope/capability changed, update implementation-status and/or context docs.
- If release risk changed (auth, billing, webhooks, sessions, OTP, observability), update release readiness/go-no-go docs.
- If sprint state changed, update delivery sprint/roadmap and append task-log entry.
- If manual validation changed, update UAT checklist and evidence links.

"Active sprint file" means the sprint document currently mapped as execution scope in `docs/delivery/roadmap.md`.

No code-only changes for behavior that affects API, release readiness, or domain constraints.

## 6) Naming conventions

- Use lowercase kebab-case filenames.
- One file per dominant purpose.
- Do not encode status in new filenames.
- Keep dates in filenames only for evidence snapshots or archive records.
- Use stable names for canonical docs (for example `product-context.md`, `runbook.md`).

Note: historical tracker filenames in `docs/archive/2026/tracking/` keep their original status-prefix naming for traceability.

## 7) Front matter policy

Target policy for active docs:

- Include YAML front matter in canonical docs with at least:
  - `title`
  - `doc_type`
  - `status`
  - `owner`
  - `created`
  - `updated`
  - `summary`
  - `related_docs`
  - `source_of_truth` (true/false)

During migration cleanup, existing docs without front matter remain valid, but canonical rewrites should adopt this policy.

## 8) Archive policy

- `docs/archive/` is historical reference only.
- Archive documents are non-authoritative unless an active doc explicitly links them.
- Move docs to archive only after a replacement source-of-truth doc exists.
- Keep archive notes mapping old path -> replacement path -> reason.

## 9) Quick-start for new developers and coding agents

1. Read `docs/README.md` and confirm precedence/rules.
2. Load context docs to understand product and architecture.
3. Load `docs/contracts/api/*` for the module you will change.
4. Check delivery docs for current sprint priorities.
5. Check release docs if your change touches auth, OTP, invites, billing/subscriptions, webhooks, observability, or UAT gates.
6. Implement changes.
7. Update docs impacted by behavior/risk/sprint changes in the same PR.

Primary backend domains to keep in scope:

- auth + sessions + OTP
- billing + subscriptions + webhooks
- company invites and membership flow
- release gates + observability + UAT execution
- sprint tracking and MVP closeout
