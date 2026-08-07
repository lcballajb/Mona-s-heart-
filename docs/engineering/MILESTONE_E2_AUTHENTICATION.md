# E2 authentication hardening milestone

## Summary

This increment adds allowlisted authentication inputs, normalized email identities, peppered session digests, account-scoped session listing/revocation, and authenticated password change with global session revocation and a security notification. Existing CSRF, secure-cookie, lockout, enumeration resistance, privileged-role approval, audit, and production fail-closed controls remain intact.

## Files changed

- `server/security.mjs`, `server/validation.mjs`, `server/service.mjs`: identity validation and credential/session lifecycle.
- `server/store.mjs`, `server/postgres-store.mjs`, `server/store-factory.mjs`: keyed session persistence and account-scoped session management.
- `server/index.mjs`: authenticated session and password routes.
- `tests/backend.test.mjs`: normalization, mass-assignment, session ownership, pepper and password-change regression tests.
- `docs/backend/API_REFERENCE.md`: implemented route inventory and security boundary.

## Risks

- Rotating `SESSION_PEPPER` invalidates all sessions. Operations must treat rotation as a planned global sign-out and never rotate only part of a fleet.
- The notification path depends on the still-unselected production email adapter; production remains fail-closed rather than silently dropping notices.
- MFA is not implemented. A documented risk decision and independent threat review are required before pilot approval.

## Remaining work

- Run PostgreSQL integration tests on a provisioned PostgreSQL service and perform independent security/timing review.
- Select and review the production email provider, then validate delivery, bounce, complaint, and incident paths.
- Obtain the product/security decision and human approval for a phishing-resistant MFA approach.
- Continue E4 database lifecycle work before completing E3 tenant isolation, in accordance with the critical path.

Previously cancelled GitHub-hosted CI jobs are an external execution limitation, not repository evidence of a defect. This milestone was validated locally; GitHub Actions must run only on GitHub-hosted runners after the pull request is opened.

## Suggested next PR

**E4 store contract and lifecycle foundation:** add shared memory/PostgreSQL contract coverage, idempotent retention/deletion execution, and an expand/contract migration procedure. KMS-backed envelope encryption and restore evidence must remain blocked until reviewed infrastructure and accountable human approvals exist.
