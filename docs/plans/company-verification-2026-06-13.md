# Company Verification Foundation

Implemented for A1 as an auditable backend foundation, not as production legal/registry evidence.

## Current behavior

- Company verification state is stored on `Company`:
  - `verificationStatus`
  - `verificationProvider`
  - `verificationCheckedAt`
  - `verificationFailureReason`
  - `verificationDetails`
  - existing `isVerified`
- Company admins can request verification through `POST /api/v1/companies/me/verification`.
- When BullMQ is enabled, the request enqueues a `company_verification` job.
- When BullMQ is disabled, the same service runs inline so local/dev environments still get a result.
- Editing company identity fields resets previous verification to `UNVERIFIED`.

## Provider note

The default provider is `simulated_registry`. It verifies only that required identity fields are present and usable. It does not represent official government registry confirmation.

Production-grade verification still needs country/provider selection, credentials, and legal/API policy review before `simulated_registry` is replaced or supplemented.
