# Manual UAT Flow Instructions

Generated at 2026-06-07T03:00:32.7705668Z

Use this file as reviewer guidance only. Attach screenshots, provider logs, CI links, Stripe event IDs, and signoff artifacts separately.

- **UAT-AUTH-001**: Log in with an admin account, refresh a protected route, then log out and confirm protected pages redirect.
- **UAT-MKT-001**: Create origin and destination locations, create a route, then create a planned transport post from that route.
- **UAT-MKT-002**: Use a second company to submit a bid, return as the post owner, accept or reject the bid, then capture the resulting state.
- **UAT-MKT-003**: Create a contract from an accepted priced bid and confirm the post detail shows the contract handoff link.
- **UAT-MKT-004**: Move the contract through allowed statuses, complete it, and confirm review eligibility appears only after completion.
- **UAT-SUP-004**: Create or update a completed-contract review and capture any trace-ID error if backend eligibility rejects it.
- **UAT-WEB-003**: Run webhook replay evidence with Stripe test event IDs and duplicate replay proof; attach logs separately.
- **UAT-OPS-001**: Attach CI required-check proof, merge-block proof, and Product/QA/Ops signoff links.
