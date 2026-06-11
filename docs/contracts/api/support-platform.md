---
title: Support Platform API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-06-08
source_legacy: none
summary: Canonical API contract for notifications, documents, and audit logs.
---

# Support Platform API Contract

## Scope

Defines implemented support service endpoints under `/api/v1/notifications`, `/api/v1/documents`, and `/api/v1/audit-logs`.

## Global conventions

- Auth required: yes.
- Success envelope: `{ "success": true, "data": ... }`.
- Error envelope includes `error.code`, `error.message`, optional `error.details`, and `meta.traceId`.
- Company admins and drivers can list company notifications/documents in backend scope.
- Company document mutations are admin-only.
- Audit log listing is company-admin only.

## Endpoints

- Notifications:
  - `GET /api/v1/notifications?page=1&pageSize=20&unreadOnly=true`
  - `PATCH /api/v1/notifications/:notificationId/read`
  - `PATCH /api/v1/notifications/read-all`
- Documents:
  - `GET /api/v1/documents?page=1&pageSize=20&kind=INSURANCE`
  - `GET /api/v1/documents/:documentId`
  - `POST /api/v1/documents`
  - `POST /api/v1/documents/upload`
  - `DELETE /api/v1/documents/:documentId`
  - `POST /api/v1/documents/:documentId/restore`
- Audit logs:
  - `GET /api/v1/audit-logs?page=1&pageSize=20&actorId=...&action=...`

## Request and response notes

- Notifications return raw notification records, ordered newest first, with optional unread filtering.
- `PATCH /notifications/read-all` returns Prisma `updateMany` output with `count`.
- Document create accepts `kind`, `name`, `mimeType`, `url`, optional `metadataJson`, and optional owner fields.
- Document upload accepts a base64 payload plus `kind`, `name`, and `mimeType`, then creates the document metadata record from the stored asset URL.
- Explicit document owner overrides are intentionally ignored; ownership is derived from authenticated user/company context.
- `STORAGE_PROVIDER=local` writes files under `LOCAL_UPLOAD_DIR` and serves them from `UPLOAD_PUBLIC_BASE_URL`.
- `STORAGE_PROVIDER=s3` is reserved for production-compatible object storage, but the S3 transport is not implemented in this build and returns `501 STORAGE_UPLOAD_NOT_IMPLEMENTED`.
- Uploads enforce `UPLOAD_MAX_BYTES` and `UPLOAD_ALLOWED_MIME_TYPES`.
- Audit logs return raw selected records ordered newest first; filters are exact `actorId` and `action` matches.
- List endpoints use page/pageSize skip/take but return arrays only, without pagination metadata.

## Error cases

- `401 UNAUTHENTICATED`: missing auth.
- `403 FORBIDDEN`: role or tenant scope violation.
- `404 DOCUMENT_NOT_FOUND` / `NOTIFICATION_NOT_FOUND`: target missing or inaccessible.
- `400 DOCUMENT_NOT_DELETED`: restore requested for an active document.
- `400 FILE_TOO_LARGE`: base64 upload exceeds configured upload limit.
- `400 UNSUPPORTED_MIME_TYPE`: uploaded MIME type is not in `UPLOAD_ALLOWED_MIME_TYPES`.
- `501 STORAGE_UPLOAD_NOT_IMPLEMENTED`: `STORAGE_PROVIDER=s3` is selected before an S3-compatible adapter exists.
- `400 VALIDATION_ERROR`: request schema failure.

## Test evidence

- `tests/integration/supportCloseout.spec.ts`
- `tests/integration/notificationsReadState.spec.ts`
- `tests/unit/modules/documents/documents.service.spec.ts`
- `tests/unit/modules/notifications/notifications.service.spec.ts`
- `tests/integration/apiSmoke.spec.ts`

## Changelog

- 2026-06-05: Created support platform API contract and aligned company-document mutations with admin-only frontend release plan.
- 2026-06-08: Added `/documents/upload` contract notes for local upload support and documented deferred S3 transport behavior.
