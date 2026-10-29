# Phase 3C: private synthetic connection messaging

PR #153 was merged into main as `2e7c719` on 2026-10-29. PR #161 now targets
main and contains only the messaging change, rebased from the original stacked
branch. The rebase preserved the complete implementation tree unchanged; the
report was then updated to record the merged base. No application is deployed.

## Journey and boundaries

A verified synthetic patient (or caregiver) requests a separately published
survivor card. The survivor accepts. Each participant opens the connection's
conversation from `/matches`, sends plain text and reads persisted history.
`/messages` directs authenticated users to their accepted connections; there is
no seeded or fabricated account conversation. Existing explicitly selected demo
screens are preserved. Refresh reloads PostgreSQL history, 100 messages at a time,
with an accessible control for older messages. The empty state says no messages
exist and either participant can send the first one.

`GET /v1/peer-messages/:connectionId?before=<messageId>` reads a history page;
`POST /v1/peer-messages/:connectionId` accepts only `{body, clientId}`. Sender and
session identity come from the existing HttpOnly cookie, with existing CSRF,
origin checks, no-store transport, body-size bounds and operational-only logs.
Message text is 1–2,000 UTF-16 code units after rejecting blank, malformed and
control-character inputs. React renders plain text, never HTML. Unsent drafts
and message history are held only in component memory, never browser storage.
An ambiguous network send keeps its client identifier when retrying on the same
page. The database unique sender/client identifier returns the existing result;
reusing it for different text returns 409. A ref guard also prevents double-click
submission. UUIDs are canonicalized before encryption binding.

The UI uses existing branding, labeled forms, keyboard controls, status/alert
regions, a mobile layout, loading and retry states. It polls every two seconds;
failed authorization clears history and disables sending. Hidden tabs clear
history and reauthorize on return. There is no background message notification.
Server denial is immediate after committed revocation, including from an open
page. Screen clearing occurs on the next recheck/failed operation, not at the
same instant as a remote transaction. Previously delivered text or screenshots
cannot be remotely erased. A lost-acknowledgement draft is retained only in memory
for an explicit retry; navigating away discards it.

## PostgreSQL authorization and races

Migration 011 creates forced-RLS `peer_messages` and `peer_message_limits`.
A connection request is the conversation identifier. No legacy demo memberships
are trusted or rewritten. RLS requires an accepted connection, the current
published survivor card, appropriate active/verified/non-deleted synthetic account
roles, participant identity and no block in either direction. Unrelated users
cannot list or read rows, including by guessed identifiers. Runtime receives
SELECT/INSERT for messages, never UPDATE/DELETE/TRUNCATE or ownership. Startup
attests forced RLS on both new tables.

The adapter explicitly uses READ COMMITTED, even if the database default differs.
Every HTTP read/send transaction locks both stable account rows in UUID order,
then takes a fresh authorization snapshot and rechecks the current session under
a shared lock. The existing connection/block/withdrawal operations use the same
account locks. Database triggers serialize card changes, request transitions,
block insertion and role mutation with message operations. Request triggers lock
the survivor boundary (not a second requester lock after a card operation),
avoiding the deadlock reproduced by the pre-existing withdrawal/acceptance test.
A revocation that wins the account lock prevents waiting reads and writes; an
operation that wins first completes before the revocation commits. No stale
frontend role or acceptance flag grants access.

A per-account database quota allows 30 new messages per fixed one-minute window.
It survives process restarts and connection withdrawal; changing conversations
does not reset it. Duplicate retries do not consume quota. Existing per-address
HTTP throttling remains. Direct runtime SQL is a trusted backend capability,
not an end-user interface: it must preserve the app.user_id transaction boundary.
As with the existing architecture, runtime SQL compromise is outside RLS's
identity-provider trust boundary.

## Encryption, configuration and deletion

Message bodies use AES-256-GCM with a fresh 96-bit nonce and authentication tag.
Associated data binds the ciphertext to the canonical connection, sender and
client-send UUID. PostgreSQL and backups receive ciphertext, never plaintext
message bodies. This is server-side encryption at rest, not end-to-end encryption;
the authorized API decrypts messages in memory. Conversation identifiers, sender
identifiers and timestamps remain database metadata.

Messaging is disabled by default. Local evaluation requires all of:

- `NODE_ENV=test` or `development`;
- `DATABASE_ADAPTER=postgres` with the existing non-owner runtime credentials;
- `SYNTHETIC_PATIENT_JOURNEY_ENABLED=true`;
- `SYNTHETIC_MESSAGING_ENABLED=true`;
- `MESSAGE_ENCRYPTION_KEY`, a random 32-byte secret encoded as canonical base64,
  supplied by the execution environment or a secret manager, outside source control.

There is no fallback key. Invalid/missing keys, memory persistence or production
synthetic mode fail startup when messaging is enabled. Tests generate independent
random keys at runtime and never print or commit them. All instances reading the
same database must receive the same key. Retain the key separately from encrypted
backups. Losing/replacing it makes existing history unreadable. Version 1 has no
online multi-key rotation tooling; production key custody, rotation, recovery,
moderation and retention review remain release blockers. No real medical data is
allowed. Logs accept operational fields only and receive neither request bodies
nor decrypted message text.

Both new tables reference profiles with deletion cascades. Messages also cascade
from the connection request. Completing either participant's established account
deletion removes the entire conversation's messages, including the other sender's
messages; the deleting account's quota disappears. Requesting deletion immediately
marks the account ineligible and revokes sessions during the existing cooling-off
lifecycle. Withdrawal/blocking revoke access but retain encrypted history until
account deletion. This increment does not change existing backup retention;
backup expiration and restore-time deletion replay require operational approval
before any real data. Dry-run backup checks do not prove a real restore.

## Evidence and review findings

Focused crypto/input tests cover nonces, ciphertext authentication, context
binding, missing/invalid keys, uppercase UUIDs, limits and unsafe inputs.
The HTTP/PostgreSQL journey uses three synthetic accounts through real cookie
sessions and proves pending denial, recipient acceptance, both senders, refresh,
a fresh database pool reading the same history, encrypted stored bytes, unrelated
account RLS denial, sender spoof denial, forbidden updates/deletes, missing CSRF,
expired sessions, role loss, deactivation, idempotency/conflicts, rate-limit
persistence, pagination, deterministic concurrent withdrawal/blocking, and actual
deletion cleanup of both senders' data. Concurrent tests wait for both HTTP
operations at the database lock boundary before committing revocation.

Chromium uses three separate browser contexts through the same-origin Vite proxy
and restricted PostgreSQL role. It covers publication, request, acceptance,
two-way text, safe rendering, refresh, mobile width, unrelated-account denial,
missing CSRF, a deliberately lost acknowledgement with nonduplicating retry,
open-page session expiry/ineligibility/withdrawal/blocking and account deletion.
Existing three-role onboarding journeys remain in the CI browser command.

Review found and corrected a lock-order deadlock in the initial new trigger design
and case-sensitive UUID encryption binding. The full suite also exposed an
existing deletion-test assumption that transaction-stable audit timestamps imply
row order. The assertion now checks complete events and their timestamp bounds,
including legitimate ties, rather than relying on an unspecified row order. The final patch still needs human
security/product review; automated checks are not independent approval.
No attachments, groups, notifications, public registration, real accounts,
production deployment or merge are enabled.

## Exact next action

Review PR #161 against main and its fresh post-rebase CI evidence. Obtain
explicit user approval before merging #161. PR #153 is already merged. Keep
production deployment and public registration disabled.

## Fresh local results — 2026-10-29

Node 24.19.0, PostgreSQL 16, restricted non-owner runtime role, system Chromium.
All commands below exited 0 after the corrections described above:

| Command                                    | Result                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `npm ci`                                   | Clean lockfile installation passed; no dependency changes                           |
| `npm run db:migrate`                       | All 11 migrations applied on a rebuilt disposable schema                            |
| `npm run db:seed` (twice)                  | Idempotent synthetic seed passed                                                    |
| `npm run db:provision-runtime`             | Least-privilege runtime provisioned                                                 |
| `npm run typecheck`                        | Passed                                                                              |
| `npm run lint`                             | Passed                                                                              |
| `npm run format:check`                     | Passed                                                                              |
| `npm run audit:repository`                 | Passed, 338 files scanned before this report update                                 |
| `npm test`                                 | 81 passed, 0 failed, 0 skipped; includes real database suites                       |
| `npm run test:postgres`                    | 1 integration suite passed; expanded HTTP/security journey included                 |
| `npm run test:browser`                     | Patient, survivor, caregiver onboarding and expanded peer/messaging journeys passed |
| `npm run build`                            | Passed; existing React Router directive warnings only                               |
| `node scripts/backup.mjs --dry-run`        | Passed; planning check only                                                         |
| `node scripts/restore-check.mjs --dry-run` | Passed; planning check only                                                         |
| `git diff --check`                         | Passed                                                                              |

Initial full-run failures were not counted as passes: the audit timestamp-order
assumption and the old authenticated messages-placeholder browser assertion were
corrected, then their applicable full commands were rerun successfully. Browser
messaging passed both before and after adding the complete deletion/expiry/retry
checks. No test used real accounts, external message delivery or production data.
