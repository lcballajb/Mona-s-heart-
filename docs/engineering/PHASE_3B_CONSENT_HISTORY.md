# Phase 3B first increment: private consent history

Built on merged PR #148 (`fb9133b`). This increment supplies the consent-history
foundation for synthetic survivor discovery and matching. Discovery, requests,
acceptance, messaging and support groups are not enabled by this change.

## Behavior

Each explicit onboarding save appends a versioned private-onboarding consent event.
Survivor saves also append the current matching preference, including a false
choice or withdrawal. Each event records only purpose, version, grant status,
identity and capture metadata; it does not copy health text or profile content.
The profile and events commit in one PostgreSQL actor-scoped transaction. A failed
consent insert rolls back the profile save. Per-account row locking serializes
concurrent saves. Ordinary basic-profile edits do not invent new consent.

The onboarding screen displays the latest 100 events, newest first, with loading,
empty, retry and error states. Earlier profile snapshots are not backfilled into
consent history. Matching preference records are not authorization to publish
private health details. Matching remains unavailable.

## Storage and access

Migration 009 adds a stable identity sequence and owner/order index to the existing
forced-RLS consent table. No table or new privilege grant is needed. The existing
runtime role can insert/read consent records but cannot update/delete them; the
approved account-deletion function retains its existing deletion responsibility.
This is append-only for the runtime, not tamper-proof against administrators or an
approved production retention policy.

`GET /v1/consent-history` derives the owner from the current session, returns a
minimal DTO and shares the disabled-by-default, non-production `.test` account
gate. It does not accept an owner selector. Existing CSRF protects profile writes.
No new cookies, browser storage, telemetry fields or dependencies were added.
`recordConsent` now uses `asUser`, allowing reuse of the same actor transaction
and rejecting mismatched contexts instead of opening a second transaction.

## Verification contract

- Unit tests: immutable prior choices, grant/withdrawal order, owner isolation,
  minimal DTO, basic edits and rejected input do not append events.
- HTTP/PostgreSQL: actual history, owner-derived reads, anonymous denial, injected
  consent-insert failure rolls back both profile and history.
- Database: mismatched actor history/consent calls fail closed; runtime update and
  delete privileges remain absent.
- Browser: all three registration/onboarding journeys show private consent
  history; survivor withdrawal retains both the earlier grant and new withdrawal.
- Existing CI: migrations, repeat seeding, restricted runtime provisioning,
  complete tests, mandatory PostgreSQL suite, Chromium, static checks and build.

Local PostgreSQL-dependent tests are skipped when no database is available. Final
PR CI is the source of PostgreSQL/browser evidence; do not infer success from
local skips. No deployment or real patient information is authorized.

## Next increment

Build a separate minimal survivor discovery record with explicit sharing consent,
then pending/accepted match requests. Enforce current consent, eligibility and
blocks in both directions. Private profile RLS must remain owner-only, and old
matching preferences must never automatically publish a survivor card. Add real
cross-account HTTP/database/browser tests before exposing discovery.
