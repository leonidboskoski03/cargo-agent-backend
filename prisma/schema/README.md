# Prisma Schema Layout v1

This project uses a split Prisma schema under `prisma/schema/`.

## Files

- `00_base.prisma`: `generator` and `datasource`
- `10_enums.prisma`: shared enums
- `20_models_identity.prisma`: company/user/auth/invite models
- `30_models_job_seeker.prisma`: wallet/credits/usage models
- `40_models_ops_assets.prisma`: notifications/documents/audit/fleet/location models
- `50_models_marketplace.prisma`: post/bid/contract/review/job application models
- `60_models_billing.prisma`: plans/subscriptions/checkout/billing events/usage models

## Commands

Use package scripts; they are wired to `--schema prisma/schema`:

- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:studio`
- `npm run prisma:validate`

`prisma/schema.prisma` is kept as a temporary fallback reference and is not the primary schema target.

