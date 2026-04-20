# [DONE] Sprint 3 - Observability Baseline

- Status: [DONE]
- Updated at: 2026-04-17 11:29:49 +02:00

## What this is

Observability baseline gives traceable logs across API requests and workers so incidents can be diagnosed quickly.

## What is implemented

- Logger enriched with service/env metadata and ISO timestamps.
- Sensitive fields are redacted (`authorization`, cookies, set-cookie).
- Request logger now uses deterministic request IDs and logs user/company/session correlation keys.
- Worker logs now include queue name, job ID, event/type, and attempts made.

## Why it matters

It becomes possible to correlate user request -> async event -> worker job failures without guessing.

## Usage

- Use `x-request-id` from API responses for support/debug lookups.
- Use queue + job metadata in worker logs for replay/failure triage.

