# Phase 3B: synthetic survivor discovery and match requests

Built on merged PR #150. Separate survivor cards contain only explicitly entered
shared alias, introduction and availability. Existing private profile/health rows
remain owner-only. Prior onboarding interest or matching preferences do not publish
a card. Survivor accounts are not represented as clinically verified mentors.

## Workflow

A verified synthetic survivor with completed onboarding explicitly accepts notice
`synthetic-discovery-v1` to publish a card. Eligible synthetic accounts can discover
up to 50 cards. A patient or caregiver explicitly accepts
`synthetic-match-request-v1` and supplies a shared alias to request a connection.
Only the recipient can accept or decline. Either participant can withdraw.
Withdrawing a card ends its pending and accepted connections. Republishing does
not revive them. A block in either direction hides discovery and makes connections
unavailable. Unblocking is intentionally not implemented in this increment.

The existing `/matches` route uses live account data for authenticated accounts and
preserves the explicitly selected demo. Loading/error/retry/empty states, refresh,
mobile layouts and labeled forms are included. Messaging and groups remain gated.
The UI lists the latest 100 connection requests and hides identifying text for
unavailable/blocked/withdrawn connections. At most 20 active outgoing requests are
allowed per account; duplicate active requests return the existing request ID.

## Persistence and authorization

Migration 010 adds forced-RLS `survivor_cards` and `peer_match_requests`, with
foreign keys to profiles so the existing account-deletion lifecycle removes these
rows. It adds forced RLS to the existing blocks table and preserves the narrowly
scoped deletion-owner policy. Startup attestation now covers all three tables.
Runtime provisioning grants only the required reads/inserts/updates; no DELETE,
TRUNCATE, schema ownership or bypass is granted. The legacy matches table is not
used by this API; existing prototype records are preserved.

Current account status, verification, deletion state, public roles and `.test`
address are checked. Card reads enforce publication, eligibility and blocks in RLS.
Request reads are participant-only; insert policies bind the requester and require
a visible published survivor. A database trigger rejects participant/consent
rewrites, requester self-acceptance and invalid terminal transitions. Store
transactions lock affected accounts in deterministic order before checking current
eligibility/blocks and mutating state. Publication withdrawal and block operations
close pending/accepted requests in the same transaction. A publication consent
event is committed atomically with the shared card.

GET `/v1/peers` returns the owner's card, available discovery cards and a minimal
request DTO. POST routes under `/v1/peers/` are `card`, `requests`, `respond`, and
`block`. Input allowlists reject owner IDs, role assignment, wrong consent versions,
invalid UUIDs, unsupported text/control characters and missing explicit consent.
Identity comes from the current cookie session. Existing CSRF, no-store responses,
telemetry redaction, rate limiting and the disabled-by-default synthetic journey
gate apply. Production startup continues rejecting synthetic mode.

## Verification

Unit tests cover explicit publication, minimal sharing, duplicates, recipient-only
acceptance, decline, withdrawal, republishing, blocking both directions and
ineligibility. HTTP/PostgreSQL tests cover real cookie/CSRF routes, private-field
exclusion, foreign-account denial, direct RLS/trigger enforcement, duplicate request
concurrency, withdrawal-versus-acceptance concurrency, blocking and actual deletion
cleanup. Chromium creates three separate verified accounts, publishes, requests,
accepts, withdraws, republishes and blocks through the UI, then checks mobile width.
Existing authentication, consent, security and three-role onboarding tests remain.
Database-dependent checks must run against a disposable PostgreSQL database;
skips are not counted as verification. See the reconciliation below for fresh evidence.

## Limits and next milestone

Synthetic data only. Shared cards are plaintext and can be seen by eligible
synthetic accounts; this does not enable production or real patient information.
No clinical ranking, medical suitability claim, automated mentor approval, message
delivery, public deployment or HIPAA compliance claim is made. Approved retention,
production encryption and moderation operations remain required before real data.

After review and explicit merge approval, connect member-only messaging for active
accepted connections. Check current eligibility, consent withdrawal and blocks on
every operation, implement message-storage protections, and prove the two-account
send/read/deny journey before enabling it.

## PR #153 reconciliation — 2026-10-29

Reviewed the complete 25-file diff against main `3568bdb`; the original PR head
was `8f4b083`. GitHub CI run 40107641691 passed both verify and dependency-review
on that head. There were no submitted reviews; CI success is not human approval.

Confirmed publication requires explicit versioned consent and records it atomically;
private onboarding is not published. PostgreSQL enforces participant isolation,
current active/verified/public-role synthetic eligibility, recipient acceptance,
terminal withdrawal, bidirectional blocking, forced RLS, and deletion cascades.
The HTTP/database and browser journeys exercise these boundaries using synthetic
accounts and the restricted runtime role.

Two confirmed gaps were fixed: registration was reachable with synthetic mode off
(now returns 503), and the memory peer adapter omitted the public-role eligibility
check enforced by PostgreSQL. Focused HTTP and adapter regressions cover both.
Production still rejects synthetic mode; public registration is disabled.

Fresh local verification used Node 24.19.0, PostgreSQL 16, a non-owner runtime
role, and Chromium: `npm ci`, typecheck, lint, format check, repository audit,
78/78 tests (zero skips), mandatory PostgreSQL/HTTP integration, build, all three
onboarding browser journeys, and the peer browser journey passed. The peer fixture
now uses a unique alias so repeat runs do not collide with preserved synthetic
cards. A prior overlapping browser invocation and the pre-fix duplicate-alias
selector failure were harness failures, corrected before this report. The build
retains the existing bundle-size and React Router directive warnings.

Current-head CI run 40957259398 passed dependency review and all code/database
checks through build, then failed installing Chromium because ubuntu-latest now
resolves to Ubuntu 26.04, unsupported by the pinned Playwright headless shell.
CI is pinned to Ubuntu 24.04 to retain a supported, reproducible browser runner.
Both serial repeat peer journeys and backup/restore dry runs passed locally.
