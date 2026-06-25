# Deleted Records Per-Module Audit

Date: 2026-06-13

Purpose: close E5 by mapping every soft-deleted Prisma model to the current module-specific recovery surface.

## Covered User-Facing Soft Deletes

| Model | Backend list/delete/restore | Frontend recovery surface |
| --- | --- | --- |
| Company | `companies` soft delete + restore | Company profile recovery action |
| User | `users` `deleted=only` + restore | Team -> Users Active/Deleted views |
| Document | `documents` `deleted=only` + restore | Documents Active/Deleted views |
| License | `licenses` `deleted=only` + restore | Fleet -> Licenses Active/Deleted views |
| Vehicle | `vehicles` `deleted=only` + restore | Fleet -> Vehicles Active/Deleted views |
| VehicleAssignment | `vehicle-assignments` `deleted=only` + restore | Fleet -> Assignments Active/Deleted views |
| Location | `locations` `deleted=only` + restore | Locations Active/Deleted registry |
| Route | `routes` `deleted=only` + restore | Routes Active/Deleted registry |
| Post | `posts` `deleted=only` + restore | Posts -> My posts Active/Deleted views |
| JobApplication | `job-applications/mine` `deleted=only` + restore | Jobs -> My job listings Active/Deleted views |
| Bid | `bids` `deleted=only` + restore | Bids Active/Deleted views |
| Contract | `contracts` `deleted=only` + restore | Contracts Active/Deleted views |
| Review | `reviews` `deleted=only` + restore | Reviews Active/Deleted views |
| VehicleMarketplaceListing | `vehicle-marketplace/mine?includeDeleted=true` + restore | Vehicle Marketplace -> My listings Active/Deleted views |

## Non-Surfaced Soft Delete Fields

| Model | Decision |
| --- | --- |
| JobApplicationSubmission | Has `deletedAt` in schema, but there is currently no delete/restore endpoint or user-facing delete action for submissions. Do not add a deleted-submissions view until submissions become user-manageable records. If deletion is added later, expose recovery from the owning job detail submissions area. |

## Closeout Decision

E5 uses module-specific deleted views rather than a global Trash area. The current implemented surfaces cover all user-facing soft-deleted records with active/deleted separation and restore actions.
