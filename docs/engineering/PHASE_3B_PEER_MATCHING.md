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
Final CI on the PR is the authoritative database/browser result. Local database
skips are not counted as verification.

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
