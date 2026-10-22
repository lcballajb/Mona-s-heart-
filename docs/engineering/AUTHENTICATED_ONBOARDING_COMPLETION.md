# Authenticated login and minimal onboarding: completion evidence

Scope: increment 1 of the [patient journey contract](AUTHENTICATED_PATIENT_JOURNEY.md).
This closes the login/minimal-profile increment, not the full patient-platform phase.
Use only synthetic `.test` accounts. No public deployment or real patient data.

## Delivered behavior

- Registration calls the real API and waits for verification; public roles remain
  patient/survivor/caregiver, with no self-assigned approved mentor capabilities.
- Verification and password-reset screens consume private development links,
  scrub token queries from browser history and show actual success/error states.
- Login creates an HttpOnly, SameSite=Strict session cookie. A typed same-origin
  client stores only CSRF and minimal session/profile state in memory.
- `GET /v1/auth/me` returns only user ID/roles, CSRF and expiry. A domain-separated
  HMAC keyed by the opaque session secret rehydrates a stable CSRF token without
  returning the cookie or storing plaintext CSRF in PostgreSQL. Existing older
  sessions change to this token on their first bootstrap; old CSRF values then
  stop working. Reloads and concurrent tabs thereafter share the stable value.
- `GET/PUT /v1/profile` derive ownership from the eligible session. DTO fields are
  bounded display name, optional pronouns and canonical locale. Mass-assigned
  owner IDs, roles and unsupported health fields are rejected. Both adapters
  implement own-profile reads; PostgreSQL uses transaction-local RLS context.
- Onboarding saves only the implemented private profile fields. Optional health,
  diagnosis, discovery and communication fields are not misleadingly collected
  and discarded by the authenticated form. The old three-step demonstration
  remains available in explicit demo mode.
- The authenticated dashboard displays the saved profile, supports editing, and
  does not present demonstration matches, messages or notifications as account
  data. Other unconnected routes clearly explain their pending status. Demo mode
  retains the original screens and cannot impersonate an authenticated account.
- Logout, observed 401 and the session expiry timer clear private display state.
  Visibility changes also check expiry to handle throttled background tabs.
  Epoch guards prevent old asynchronous responses from restoring cleared state.
- Network failures show retry states; missing/invalid fields do not navigate as
  though registration, reset or profile saving succeeded.
- A loopback-only Vite proxy forwards `/v1` and health requests, preserving the
  browser's own origin. No permissive CORS, public tunnel or provider was added.

## Confirmed defect corrected

The first Chromium run reached password reset and failed. PostgreSQL's existing
`updatePassword` referenced `users.updated_at`, absent from all migrations.
Removing that nonexistent assignment preserves password hash/algorithm updates
without an unnecessary migration. The same real-browser reset flow then passed
and signed in with the changed password. Existing credential/token cutoff tests
remain passing. This was an executed regression, not an inferred fix.

## Local-only operation

The new APIs default off. Set `SYNTHETIC_PATIENT_JOURNEY_ENABLED=true` only for the
local synthetic workflow; production startup rejects this flag. Profile/session
bootstrap rejects accounts outside `.test`, and opt-in registration rejects real
email domains before creating a user. Existing production provider validation is
preserved.

For manual local verification, use the normal migration and runtime provisioning
commands with disposable PostgreSQL, then run API and Vite in separate terminals:

```sh
NODE_ENV=development DATABASE_ADAPTER=postgres DATABASE_SSL=false \
SYNTHETIC_PATIENT_JOURNEY_ENABLED=true EMAIL_PROVIDER=development_file \
DEVELOPMENT_OUTBOX_DIR=/absolute/private/temp-directory \
PUBLIC_APP_URL=http://127.0.0.1:5173 CORS_ALLOWLIST=http://127.0.0.1:5173 \
npm run start:api
npm run dev
```

Supply `DATABASE_URL` and `DB_RUNTIME_USER` separately using the restricted local
runtime role. Never give the API migrator credentials. Outbox files contain
synthetic action links and must stay outside the repository/published assets in
a private 0700 directory; files are 0600 and never served by an API endpoint or
printed into ordinary telemetry. Open the synthetic link locally to verify or
reset. Remove the private outbox after use. Production email is not implemented.

## Verification

- Focused profile and CSRF tests initially failed because the required operations
  were absent, then passed after implementation.
- `npm test`: 71 pass, zero failures/skips with disposable PostgreSQL 16.15 and a
  restricted runtime identity. Includes real HTTP own-profile CRUD, anonymous
  denial, cross-user isolation, mass-assignment rejection, origin/CSRF denial,
  inactive account denial, private outbox permissions, production rejection and
  API-default-off checks; existing authentication/deletion/RLS suites remain.
- `npm run test:postgres`: mandatory PostgreSQL suite passes.
- `npm run test:browser`: actual Chromium through Vite/API/PostgreSQL passes
  register -> unverified denial -> verify -> login -> onboarding save -> reload
  -> concurrent tab -> edit -> logout -> reset -> returning login. Also checks
  missing-CSRF denial, HttpOnly cookie visibility, empty local/session storage,
  automatic client-expiry clearing, server-expiry rejection, network failure and
  retry, mobile menu/layout, and explicit demo preservation.
- Desktop and 390px mobile screenshots were inspected. Mobile menu visibility,
  accessible menu labels and content wrapping were corrected; there is no
  horizontal overflow in the checked profile view. This is not a full WCAG audit.
- Typecheck/lint, formatting, repository link audit, build and `git diff --check`
  pass. `npm audit --json` reports zero known vulnerabilities.
- Playwright 1.56.1 is a pinned development-only test dependency. CI now installs
  headless Chromium and runs the browser journey as part of required `verify`.
  No new production package or external service is required. The initial local
  Playwright 1.62.1 browser download was unavailable; the final manifest/lockfile
  use the verified 1.56.1 runner, not that intermediate attempt.

Local PostgreSQL uses the previously documented temporary OS-UID shim because
this container lacks mapped non-root OS identities. Database roles, grants and
RLS assertions are real. GitHub CI uses its normal PostgreSQL 16 service. Remote
CI is a separate merge gate and must pass at the final PR head; local evidence is
not a claim of remote success. No public deployment is authorized by this change.

## Remaining patient journey

Next is increment 2: explicit versioned consent and persisted patient/survivor
onboarding preferences with private defaults. After that, complete consented
survivor discovery and accepted matching, membership-authorized messaging and
support-group participation, followed by one combined browser journey. Encryption,
production delivery/storage/scanning, retention/legal policies and staffed
moderation remain release gates. Do not enable real patient information.
