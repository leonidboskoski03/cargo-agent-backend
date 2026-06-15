# Account Required Fields Matrix

Date: 2026-06-13

Purpose: define which Company/User fields are required at registration, which belong in post-login setup, and which should block marketplace actions later.

## Registration

These fields are required before an account can be created:

| Audience | Required fields | Notes |
| --- | --- | --- |
| All users | account type, first name, last name, email, password, phone, email OTP verification | Phone is required early so operational contacts are not anonymous. |
| Company admin | company name, company type, registration number, country, city | Creates the company workspace and first admin. |
| Job seeker | none beyond all-user fields | Driver profile details move to post-login setup. |

## Post-Login Setup

These fields improve trust and matching, but should not block account creation:

| Audience | Setup fields | Preferred surface |
| --- | --- | --- |
| Company | address, VAT number, company email, company phone, website, logo, bio, employee count | Company profile / future onboarding wizard |
| Job seeker | country, city, professional headline, years experience, available-from date, preferred routes, profile image | Job profile / future onboarding wizard |
| Company team user | phone, invite acceptance, role membership | Team invite flow / profile |

## Marketplace Action Blockers

Recommended future blockers for B25:

| Action | Block until present |
| --- | --- |
| Create transport post | company exists, company name, type, registration number, country, city, active subscription/free plan |
| Submit bid | company exists, company name, type, registration number, country, city |
| Create contract | company exists, company name, type, registration number, country, city |
| Publish vehicle marketplace listing as company | company exists, company name, type, registration number, country, city |
| Publish vehicle marketplace listing as job seeker | phone, country, city |
| Create job-seeker listing | phone; recommend country/city before publishing but do not block MVP account creation |
| Apply to job listing | phone; recommend profile headline/city for quality |

## Current Implementation Decision

B23 first slice keeps registration compact:

- Account step now requires phone.
- Company registration requires only company name, type, registration number, country, and city.
- Company address is deferred to post-login company profile completion.
- Job seekers are created immediately after OTP and can complete driver details from the job profile page.

B24 should convert the post-login setup fields into a guided onboarding flow.
B25 should enforce the marketplace action blockers centrally in backend services and mirror them with frontend CTAs.
