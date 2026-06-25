---
title: Geo And Localization API Contract
doc_type: api-contract
status: active
owner: backend
created: 2026-06-06
updated: 2026-06-13
summary: Canonical contract for frontend catalog-backed language, country, and city inputs.
---

# Geo And Localization API Contract

All endpoints are mounted under `/api/v1`.

## Localization

- `GET /localization/languages`

Returns the supported UI language catalog. Frontend may fall back to local bundled languages only if this endpoint is unavailable.

## Geo Catalog

- `GET /geo/countries`
- `GET /geo/cities?countryCode=MK&q=sk&pageSize=20`

Countries and cities are backend-driven catalog data. Country codes are two-letter uppercase ISO-style codes. City search is filtered by `countryCode`, optional query text, and bounded page size.

`GET /geo/countries` response items:

- `code`
- `name`
- `nativeName`
- `displayName`
- `region`
- `lat`
- `lng`

`GET /geo/cities` response items:

- `id`
- `countryCode`
- `name`
- `displayName`
- `region`
- `adminCode`
- `lat`
- `lng`

Coordinates are decimal catalog centroids suitable for centering selectors, route previews, and map defaults. They are not a substitute for road geometry.

## Evidence

- `tests/integration/routesGeoPrivacy.spec.ts`
- Frontend consumers: location forms, route quick-create flows, company settings country select, language selector.
