# Task3 Trailer Support Plan

Source task: `task3.md` K1.

## Decision

Use the existing `Vehicle` model with `vehicleType = TRAILER` as the trailer record model.

Do not create a separate `Trailer` table in the first implementation pass. The current backend and frontend already understand `VehicleType.TRAILER` in fleet records, marketplace listings, filters, and job seeker vehicle ownership. Building parity around the existing type keeps permissions, ownership, media, deletion, marketplace publishing, and assignment logic consistent.

## Current Evidence

Existing backend support:
- Prisma enum `VehicleType` includes `TRAILER`.
- Fleet `Vehicle` records store `vehicleType`.
- Vehicle marketplace listings store `vehicleType`.
- Vehicle marketplace filters accept `TRAILER`.
- Backend integration tests already create a standalone trailer marketplace listing.

Existing frontend support:
- Fleet add/edit vehicle form includes Trailer in the type picker.
- Vehicle marketplace create/edit forms include Trailer.
- Public marketplace filters include Trailer.
- My vehicle listings and inquiries render trailer listing data.
- Job seeker profile vehicle ownership form includes Trailer.

## Product Scope

Treat trailers as fleet assets that can be:
- Registered in fleet.
- Listed on the vehicle marketplace.
- Owned by a company or job seeker where existing vehicle ownership allows it.
- Filtered and browsed in the marketplace.
- Managed through the same active/deleted views and owner status controls.

Trailer-specific fields are not added in the first parity pass unless UAT requires them. Candidate later fields:
- Trailer subtype/body.
- Axle count.
- Length.
- Coupling type.
- Max payload.
- Inspection expiry.

## Backend Implementation Plan

K2 should verify and harden parity rather than introduce a new table:
- Add backend tests specifically named around trailer fleet create/update/delete/restore.
- Add marketplace tests for trailer browse filter, owner status changes, and detail access.
- Confirm validators and repository selects do not assume trucks.
- Confirm source fleet vehicle publishing works when the source vehicle is a trailer.
- Update API docs to state trailers are represented by `Vehicle.vehicleType = TRAILER`.

No migration is required for the first parity pass unless trailer-specific fields are approved later.

## Frontend Implementation Plan

K3 should make trailer support more discoverable:
- Add focused tests for trailer creation in Fleet Vehicles.
- Add focused tests for trailer listing creation/editing in Vehicle Marketplace.
- Ensure labels say "Vehicles and trailers" where the UI currently implies trucks only.
- Keep forms compact and avoid trailer-only fields until the backend model has them.
- Ensure browse/list cards show Trailer as the vehicle type when brand/model are absent.

## Permission Model

Reuse existing vehicle permissions:
- Company admins can manage company trailer fleet records and company-owned trailer listings.
- Company drivers can inspect company trailer records where fleet read access exists.
- Job seekers can create standalone trailer listings where vehicle marketplace ownership already allows it.

## Acceptance For K2/K3

K2 is complete when backend tests prove trailer parity through fleet and marketplace APIs.

K3 is complete when frontend tests prove users can create/manage trailer records and listings without truck-specific copy blocking the workflow.
