---
title: Delivery And Media API Contract
doc_type: api-contract
status: active
owner: backend
created: 2026-06-06
updated: 2026-06-06
summary: Canonical contract for OTP/invite delivery evidence and document upload transport.
---

# Delivery And Media API Contract

## Delivery Status

- `GET /api/v1/delivery/status`

Requires authentication. Returns configured email, OTP, invite, and storage mode:

- `email.provider`: `resend` or `simulated`.
- `email.configured`: true only when provider requirements are present.
- `otp.provider`: configured OTP provider name.
- `otp.previewEnabled`: true only in non-production preview mode.
- `invites.acceptUrlBase`: invite accept URL base.
- `storage.provider`: `local` or `s3`.
- `storage.configured`: true when the selected storage provider has required config.

## OTP And Invite Delivery

OTP delivery supports simulated local/test mode and provider-backed email mode through `AUTH_OTP_PROVIDER=resend_email` with `EMAIL_PROVIDER=resend`.

Company invites use the same email delivery abstraction. Simulated mode may return preview accept URLs outside production. Provider mode dispatches through the configured email provider.

## Document Upload

- `POST /api/v1/documents/upload`

Requires authentication. Company admins and job seekers can upload supported file content and create a document metadata record in one operation. Company drivers remain read-only.

Request body:

- `kind`: document kind.
- `name`: display name.
- `mimeType`: `image/jpeg`, `image/png`, `image/webp`, or `application/pdf`.
- `fileName`: original file name.
- `contentBase64`: raw base64 or data URL payload, max 5 MB.
- `metadataJson`: optional metadata.
- `ownerUserId` / `ownerCompanyId`: ignored for ownership decisions; ownership is derived from auth.

Response is the created document record. `url` points to the stored asset, and `metadataJson.storage` includes provider, key, size, and sanitized file name.

Storage behavior:

- `STORAGE_PROVIDER=local` writes to `LOCAL_STORAGE_PATH` and serves through `PUBLIC_UPLOADS_BASE_URL`.
- `STORAGE_PROVIDER=s3` uploads with S3-compatible SigV4 `PUT` requests using `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_PUBLIC_BASE_URL`.
- Missing S3 configuration returns `STORAGE_PROVIDER_NOT_CONFIGURED`; provider rejection returns `STORAGE_PROVIDER_ERROR`.

## Evidence

- `tests/integration/deliveryStatus.spec.ts`
- `tests/integration/authOtpFlows.spec.ts`
- `tests/integration/companyInvitesFlow.spec.ts`
- `tests/integration/supportCloseout.spec.ts`
- `tests/unit/shared/delivery/emailDelivery.spec.ts`
- `tests/unit/shared/storage/storageService.spec.ts`
