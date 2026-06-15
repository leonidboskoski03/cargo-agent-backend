# Trailer Support Decision

Date: 2026-06-14

## Current State

- Backend vehicle type already supports `TRUCK`, `TRAILER`, and `VAN`.
- Fleet vehicles store trailers in the same `Vehicle` model as trucks and vans.
- Vehicle marketplace listings also support `TRAILER`, either as standalone listings or linked to a saved fleet vehicle.
- There is no current truck-to-trailer attachment relation in the data model.

## Decision

For the current MVP, trailers are first-class vehicles/assets.

This means:

- A company can create a trailer in the fleet registry using `vehicleType = TRAILER`.
- A trailer can be listed in the vehicle marketplace independently.
- A marketplace listing can be standalone or linked to the saved trailer vehicle record.
- The add/edit vehicle UI should keep trailer as a normal vehicle type and make body/capacity fields clear enough for trailers.

## Deferred

Do not add truck-to-trailer attachment in this batch.

Future trailer coupling can be modeled separately if dispatch workflows need it, for example:

- `VehicleCoupling` with `tractorVehicleId`, `trailerVehicleId`, `startsAt`, `endsAt`.
- Validation that tractor is `TRUCK` and trailer is `TRAILER`.
- Assignment/route planning UI that can choose a truck and trailer combination.

## Implementation Implication

Batch E3/E4 should clean the vehicle form around the existing first-class vehicle model instead of introducing a new trailer entity.
