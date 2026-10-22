# Phase 3A: authenticated synthetic onboarding

PR: https://github.com/lcballajb/Mona-s-heart-/pull/148

Baseline: main `4f273a2a1ac8305c8231b8c3a707eeaf2d49b198`, fetched before
implementation. PR #143 is merged. Closed, unmerged #35 and #64 were reconciled
through merged #144 (actor-context RLS) and #145 (account deletion); their original
branches were not merged or cherry-picked. The Phase 2 readiness assessment and
known limitations were reviewed. PR #147 already connected authentication and
basic profiles; this change extends that work.

## Implemented behavior

Registration, verification, cookie login, recovery/reset, logout, route protection,
expiry and revoked-account checks remain connected to the real API. This change
adds optional private details for each registered public role:

- Patient: diagnosis, symptoms, medications and support preferences.
- Survivor: lived experience, availability, willingness to mentor, explicit
  matching consent and support preferences. Matching consent defaults off and can
  be withdrawn by unchecking and saving. Neither preference grants a mentor role
  or publishes a profile.
- Caregiver: caregiver information and support preferences. No access to another
  person's records is granted.

Every onboarding save requires explicit agreement to the versioned synthetic
notice. The server records its version, account type and completion timestamp;
it derives identity and account type from the authenticated actor. Optional text
is bounded, trimmed and rejects malformed Unicode and unsupported controls. Fields
belonging to another role, extra owner/role fields, nonboolean consent and public
visibility are rejected. The dashboard shows persisted details, completion status,
an edit action and truthful unavailable-feature states. Existing branding and the
explicitly separated fictional demo are preserved.

## Persistence and API

Migration `008_private_synthetic_onboarding.sql` adds nullable, bounded JSONB
`profiles.onboarding`. The existing forced owner RLS and `asUser` transactions
apply to reads and writes; existing deletion removes the complete profile row.
No new grants, RLS bypasses or privileged client-supplied identity are introduced.
Run migrations before deploying this code in a local synthetic environment.

`GET /v1/profile` includes onboarding when present. `PUT /v1/profile` accepts a
strictly validated onboarding object. Omitting it preserves previously saved
onboarding for older basic-profile clients; saving empty optional text removes
that detail. The input consent checkbox is not inferred from stored data. New
accounts have no completion timestamp until an explicit onboarding save.

The opt-in `SYNTHETIC_PATIENT_JOURNEY_ENABLED` gate remains false by default,
restricts these routes to `.test` accounts and is rejected by production startup.
Cookies, same-origin transport, CSRF, no-store responses, current account
eligibility and memory-only client credentials are unchanged. Private fields are
not added to telemetry. See `AUTHENTICATED_ONBOARDING_COMPLETION.md` for existing
local API/private outbox setup. No production or public service was enabled.

## Files changed

| Files                                                                              | Purpose                                                         |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `server/onboarding.mjs`, `server/service.mjs`                                      | Role, text, privacy and consent validation; safe profile DTO    |
| `server/store.mjs`, `server/postgres-store.mjs`                                    | Preserve/save private onboarding through existing owner context |
| `db/migrations/008_private_synthetic_onboarding.sql`                               | Additive private profile column                                 |
| `src/auth/client.ts`, `src/auth/Screens.tsx`                                       | Typed DTO and accessible role-specific forms                    |
| `src/main.tsx`, `src/styles.css`                                                   | Persisted dashboard summary and responsive form layout          |
| `tests/onboarding.test.mjs`, `tests/http-auth-journey.mjs`                         | Validation, consent, role, persistence and ownership evidence   |
| `tests/browser-onboarding.mjs`, `tests/browser-all-onboarding.mjs`, `package.json` | Run real Chromium journeys for patient, survivor and caregiver  |
| `docs/KNOWN_LIMITATIONS.md`, this report                                           | Current scope, evidence and release limitations                 |

## Verification

The focused onboarding test failed before implementation because the API rejected
the missing onboarding contract, then passed after implementation. Local Node 24
checks passed: unit suite (72 pass, two PostgreSQL-dependent skips), lint/typecheck,
format, repository audit and production build. PostgreSQL and Chromium are not
installed in this session; the PR's existing mandatory CI supplies PostgreSQL 16
and Chromium, with separate migrator and restricted runtime credentials. Consult
PR checks for final-commit results; local skips are not database evidence.

The HTTP integration test saves synthetic health details, reads them back via API,
checks the actual PostgreSQL row, rejects ownership/role/consent/CSRF violations,
clears optional details, and proves a second account cannot retrieve the profile.
The existing database suite exercises missing/mismatched actor context, forced RLS,
unsafe runtime roles and account deletion. The new column inherits those policies.

`npm run test:browser` now runs the full real-browser journey separately for all
three roles: register, unverified-login denial, verify, login, private onboarding,
PostgreSQL-backed refresh, another tab, edit, consent withdrawal for survivors,
logout, protected-route denial, password reset, return, session expiry and network
failure recovery. It checks mobile overflow and empty browser token storage.
This is not a comprehensive assistive-technology or WCAG audit.

## Remaining limits and next milestone

These optional details are synthetic-only plaintext JSONB. This is not production
health-data encryption, a clinical medication workflow, or an approved legal
consent system. Privacy currently supports owner-only visibility; there is no
sharing selector. Consent stores the current notice/version and preference, not
an immutable consent-event history. Production KMS, approved notices, retention,
real email delivery and independently reviewed authorization remain release gates.
No real patient information or HIPAA compliance claim is permitted.

After review, green final-commit CI and explicit user merge approval, the next
milestone is consent-aware synthetic survivor discovery and accepted matching:
versioned consent history, visibility and block enforcement, minimally disclosed
survivor cards, and cross-account authorization tests. Messaging and support groups
must remain honest empty states until their member-only workflows are connected.
