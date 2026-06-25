# Task3 Marketplace Replies Plan

Source task: `task3.md` I5.

## Decision

Implement marketplace replies as lightweight workflow threads, not a global real-time chat product.

Each marketplace workflow keeps its existing parent record:
- Vehicle marketplace: `VehicleMarketplaceInquiry`.
- Transport marketplace: `Bid`.
- Job marketplace: `JobApplicationSubmission`.

Add reply records under those parents so owners and counterparties can continue the conversation after the initial message. This keeps permissions, status, and notification behavior close to the existing workflow instead of introducing a broad chat inbox too early.

## Backend Shape

Add three reply models:
- `VehicleMarketplaceInquiryReply`
- `BidReply`
- `JobApplicationSubmissionReply`

Shared fields:
- `id`
- parent id
- `authorUserId`
- `authorCompanyId`
- `message`
- `createdAt`
- `updatedAt`
- `deletedAt`

Rules:
- A participant can reply only if they already own, sent, or received the parent workflow record.
- Soft-delete replies for auditability.
- Return replies newest-last inside parent detail/list endpoints where practical.
- Emit notifications on new replies to the opposite participant set.

## API Shape

Vehicle inquiries:
- `GET /api/v1/vehicle-marketplace/inquiries/:inquiryId/replies`
- `POST /api/v1/vehicle-marketplace/inquiries/:inquiryId/replies`
- `DELETE /api/v1/vehicle-marketplace/inquiries/:inquiryId/replies/:replyId`

Transport bids:
- `GET /api/v1/bids/:bidId/replies`
- `POST /api/v1/bids/:bidId/replies`
- `DELETE /api/v1/bids/:bidId/replies/:replyId`

Job submissions:
- `GET /api/v1/job-applications/submissions/:submissionId/replies`
- `POST /api/v1/job-applications/submissions/:submissionId/replies`
- `DELETE /api/v1/job-applications/submissions/:submissionId/replies/:replyId`

## Implementation Status

Done in the task3 I5 slice:
- Added `VehicleMarketplaceInquiryReply`, `BidReply`, and `JobApplicationSubmissionReply`.
- Added participant-only list/create/delete APIs for all three parent workflows.
- Added reply notification events routed to the opposite participant.
- Added compact frontend reply composers to Vehicle Inquiries, Bids, and Applications.
- Verified with focused backend integration/unit tests, frontend tests, Prisma validation, and frontend build.

## Frontend Shape

Use a compact threaded panel on existing detail/card workflows:
- Vehicle inquiries page: inline thread under each expanded inquiry card or detail drawer.
- Bids/contracts workflow: thread on bid detail/row action.
- Job applications page: thread on each submission card.

UI constraints:
- No full chat sidebar yet.
- No real-time websocket requirement in the first slice.
- Use optimistic append only after API success.
- Keep reply composer compact: textarea, send button, status/error line.

## Test Plan

Backend:
- Participant authorization per parent type.
- Non-participant receives 403.
- Reply create/list ordering.
- Soft-deleted reply hidden from normal list.
- Notification event enqueued on reply.

Frontend:
- Reply composer submits message.
- Replies render in chronological order.
- Unauthorized or missing reply action is hidden by role/ownership.
- Focused page tests for vehicle inquiries, bids, and job applications.

## Open Follow-Up

After UAT, decide whether these workflow threads should roll up into a unified inbox. That is intentionally out of scope for the first implementation.
