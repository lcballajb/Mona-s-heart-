# Authenticated patient journey: implementation contract

Prepared October 21, 2026 (America/Chicago). Synthetic information only.
Preserve the current Mona's Heart branding, routes, and explicit demo experience.
No public deployment, real-patient invitation, provider activation, or clinical AI.

## Prerequisite integration

Merge order: #143 (session/telemetry/dependencies), #144 (replacement for #35),
then #145 (replacement for #64). Never merge the older conflicting/unsafe versions.
The replacements preserve imported-document ownership checks, forced RLS, runtime
role attestation, account eligibility, and the original feature branches.
All implementation below belongs on a new branch from the reconciled main.

## What exists and what is missing

The API already implements registration, verification, sign-in/out, password
recovery/change, CSRF, session revocation and account export/deletion requests.
The frontend Auth and Onboarding handlers in `src/main.tsx` currently navigate
without authentication or durable saves. Profile persistence operations exist,
but no profile HTTP endpoints. Matching, conversations and groups are principally
UI demonstrations; do not expose the existing helper/store examples as public
APIs without enforcing authorization at the service and persistence boundaries.

## Acceptance journey

Use fictional patient Alice, survivor Sam and unrelated user Bob with `.test`
email addresses. Only synthetic conditions and message content may be entered.

1. Alice registers as patient; verification is required before login. Invalid,
   expired and replayed tokens fail without exposing credentials. Privileged mentor
   roles cannot be self-assigned by choosing survivor in onboarding.
2. Login creates an HttpOnly cookie. Frontend state holds only a CSRF token and
   minimal account/profile data in memory. Never put credentials, session tokens,
   health data or message bodies in local/session storage or telemetry. Reload
   restores the session from the server; logout and expiry clear all cached data.
3. Alice saves the minimal onboarding profile, reloads and sees the saved data.
   Every write derives the owner from the current eligible session. Optional
   sensitive fields stay private and are not required to finish onboarding.
4. Sam separately opts into synthetic discovery. Only eligible, verified,
   consented, visible, unblocked survivor profiles appear. Alice explicitly
   requests a connection; Sam accepts. Roles and visibility are rechecked at
   request/accept time; an arbitrary profile ID never grants access.
5. Alice and Sam exchange a synthetic message, reload and see durable messages.
   Bob cannot list, read, send to, join, or guess their conversation. Blocking,
   revoked membership or account deactivation immediately denies new requests.
6. Alice joins an eligible synthetic support group, reads/posts, leaves, then
   loses access to private group content. Bob cannot read a private group by ID.
7. Logout denies the same protected APIs. Deletion immediately revokes access;
   completion respects cooling-off/holds and removes private data. No later
   recovery flow reactivates a deletion-pending or deleted account.

## Ordered increments and API contracts

| Order | Deliverable                              | Boundary and acceptance evidence                                                                                                                                                                                               |
| ----- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Authenticated shell + minimal profile    | `GET /v1/auth/me`, `GET /v1/profile`, `PUT /v1/profile`; existing auth endpoints; protected route wrapper and typed same-origin client; real browser register/verify/login/reload/logout plus PostgreSQL cross-user/CSRF tests |
| 2     | Patient/survivor onboarding              | Explicit purpose/version consent and private defaults; bounded validated fields; transactionally save only implemented fields; both adapters return the same DTO; persistence/reload and no-mass-assignment tests              |
| 3     | Survivor discovery and accepted matching | Consent/visibility/block eligibility query, pagination and connection state machine; separate user-owned profile from public discovery projection; negative authorization matrix and concurrent accept tests                   |
| 4     | Messaging for accepted connections       | Conversation/member/message CRUD; sender derived from actor; bounded bodies, pagination, idempotent sends; forced RLS and membership lifecycle; two-party browser journey and outsider/blocked access denial                   |
| 5     | Support-group participation              | Schema/RLS for groups, memberships and posts; explicit join/leave/approval states and moderation capabilities; member-only access, revoked access, cross-group tests                                                           |
| 6     | Integrated journey gate                  | Full browser journey against real local API + disposable PostgreSQL; refresh/back navigation, pending/error/empty states, mobile keyboard and accessibility checks; all required GitHub checks                                 |

The exact next coding action is increment 1, starting with API session/profile
DTOs and failing ownership/CSRF integration tests, then connecting the existing
login form. Do not start video, AI, EHR, payments or additional feature areas.

### Increment 1 contract

- `GET /v1/auth/me`: 200 `{ user: { id, roles }, csrfToken }` for an active,
  verified, non-deleted session; otherwise 401. Use a server-created synchronizer
  token; never return the raw session cookie, digest, email verification token or
  password fields. PostgreSQL currently stores only the CSRF digest: implement a
  safe rotation/rehydration design rather than attempting to recover plaintext
  from it. Concurrent tabs/requests must remain well-defined.
- `GET /v1/profile`: own minimal DTO `{ displayName, pronouns, locale }`, using a
  consistent empty profile when none exists. No owner ID from query parameters.
- `PUT /v1/profile`: CSRF required; strict object schema, bounded strings, locale
  validation; reject/ignore ownership and role assignment fields consistently.
  `asUser(actor.id, ...)` protects all SQL reads/writes. Add get-own-profile to the
  adapter contract and both implementations before wiring the route.
- The client sends `credentials: 'same-origin'`; mutating requests attach CSRF.
  Clear authenticated state on 401; show recoverable network/validation failures;
  avoid redirects to dashboard on unsuccessful registration or password reset.
- Keep explicit demo navigation clearly separate from authenticated navigation.
  Demo navigation must never imply an authenticated backend session. Preserve
  all existing visual components and copy except inaccurate success messages.
- Local verification delivery uses the development provider/outbox under test
  control. Never add a public endpoint to retrieve verification/reset tokens.
- Add a same-origin local development proxy only for `/v1` and health checks;
  no permissive CORS, public tunnel, production provider or real dataset.

## Authorization and safety matrix

| Resource/action             | Allowed                                                 | Required denial cases                                                                  |
| --------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Own profile read/write      | Eligible owner; CSRF on mutation                        | Anonymous, inactive/deleted, foreign owner, mass-assigned role                         |
| Survivor discovery          | Eligible consented viewer and visible eligible survivor | Private/withdrawn, blocked in either direction, deactivated survivor                   |
| Connection request/accept   | Eligible distinct users; recipient accepts own request  | Self-match, spoofed recipient/actor, replay, blocking, invalid transition              |
| Conversation list/read/send | Active accepted membership at request time              | Outsider, revoked membership, blocked sender, deleted account, CSRF failure            |
| Group content/join/leave    | Membership and group-specific policy                    | Private group ID guessing, revoked membership, cross-group access, self-promotion      |
| Account lifecycle           | Session-derived request; restricted completion worker   | Spoofed user, held/cancelled/unverified/future-due completion, credential resurrection |

## Evidence and release boundaries

Each increment must include focused negative tests, adapter parity, actual HTTP
integration against restricted PostgreSQL, typecheck/lint/format/audit/build, and
fresh required CI on the final head. Browser checks must exercise the real client,
not just navigate static screens. Distinguish local checks from remote CI and
leave pending checks pending. Do not claim that passing infrastructure tests
establishes a working patient journey or compliance.

The current encryption/KMS, production delivery/storage/scanning, consent and
retention approval, staffed moderation and operational safeguards remain release
gates. Preserve fail-closed provider configuration. Any temporary synthetic-only
adapter must be explicitly gated, reject production startup and never imply
health-data encryption from a plain `Buffer.from` conversion.
