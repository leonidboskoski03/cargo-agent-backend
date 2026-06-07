---
title: Backend Coverage Matrix
doc_type: release-evidence
status: active
owner: release-owner
created: 2026-06-06
updated: 2026-06-06
summary: MVP backend module coverage map across routes, contracts, tests, frontend consumers, and evidence.
---

# Backend Coverage Matrix

| Module | Mounted route | Contract | Automated evidence | Frontend consumer | Status |
|---|---|---|---|---|---|
| auth | `/auth` | `auth.md` | `authOtpFlows`, `authPasswordFlows`, `authGuards` | login, registration, invite accept | COVERED |
| companies | `/companies` | `companies.md` | `companyProfileMedia`, marketplace/release smoke | company settings | COVERED |
| companyInvites | `/company-invites` | `company-invites.md` | `companyInvitesFlow` | team invites, invite accept | COVERED |
| users | `/users` | `users.md` | marketplace/release smoke | team, profile completion | COVERED |
| licenses | `/licenses` | `fleet.md` | `fleetCloseout` | fleet licenses | COVERED |
| vehicles | `/vehicles` | `fleet.md` | `fleetCloseout` | fleet vehicles | COVERED |
| vehicleAssignments | `/vehicle-assignments` | `fleet.md` | `fleetCloseout` | fleet assignments | COVERED |
| locations | `/locations` | `marketplace-operations.md` | `routesGeoPrivacy`, marketplace/release smoke | locations, quick posts | COVERED |
| routes | `/routes` | `marketplace-operations.md` | `routesGeoPrivacy`, marketplace/release smoke | routes, posts | COVERED |
| posts | `/posts` | `marketplace-operations.md` | `marketplaceScenario`, `marketplaceEndToEnd`, usage tests | posts | COVERED |
| bids | `/bids` | `marketplace-operations.md` | `marketplaceScenario`, `marketplaceEndToEnd`, usage tests | post detail | COVERED |
| contracts | `/contracts` | `marketplace-operations.md` | `marketplaceScenario`, `supportCloseout`, unit workflow | contracts, reviews | COVERED |
| reviews | `/reviews` | `reviews.md` | `supportCloseout`, unit tests | reviews | COVERED |
| documents | `/documents` | `support-platform.md`, `delivery-and-media.md` | `supportCloseout` | documents, media upload consumers | COVERED |
| notifications | `/notifications` | `support-platform.md` | `notificationsReadState`, `supportCloseout` | notifications, shell preview | COVERED |
| auditLogs | `/audit-logs` | `support-platform.md` | `supportCloseout` | audit logs | COVERED |
| plans | `/plans` | `plans.md` | `billingPlans`, entitlement tests | billing | COVERED |
| subscriptions | `/subscriptions` | `company-billing-subscriptions.md` | `subscriptionWebhookLifecycle`, `billingPlans` | billing | COVERED |
| billing | `/billing` | `company-billing-subscriptions.md` | `billingPlans`, webhook evidence | billing events | COVERED |
| jobApplications | `/job-applications` | `job-applications.md` | `jobApplicationsScenario`, `marketplaceEndToEnd` | deferred job lane | COVERED, FRONTEND DEFERRED |
| jobSeekerBilling | `/job-seeker-billing` | `job-seeker-billing.md` | `jobSeekerBilling`, `jobSeekerWebhookIdempotency` | deferred job lane | COVERED, FRONTEND DEFERRED |
| geo | `/geo` | `geo-localization.md` | `routesGeoPrivacy` | country/city inputs | COVERED |
| localization | `/localization` | `geo-localization.md` | route/catalog smoke | language selector | COVERED |
| delivery | `/delivery` | `delivery-and-media.md` | `deliveryStatus` | release/admin diagnostics | COVERED |
| webhooks | `/webhooks/stripe` | `delivery-and-media.md`, billing contracts | `test:evidence:webhooks` | external Stripe | COVERED, EXTERNAL EVIDENCE PENDING |

## Remaining Release Evidence

Coverage is implementation-complete for MVP module contracts, but release verdict remains `NO-GO` until external Stripe replay artifacts, CI branch-protection proof, manual UAT, and cross-functional signoff are attached.
