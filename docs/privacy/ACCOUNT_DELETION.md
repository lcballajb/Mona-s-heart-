# Account deletion lifecycle

## Implemented

`DELETE /v1/account` derives the account exclusively from the authenticated
session actor. Request bodies and `userId`, `ownerId`, or `accountId` values do
not select the target. One transaction changes `users.status` from `active` to
`deletion_pending`, revokes every session, consumes every recovery/auth token,
creates at most one open request, and queues one idempotent deletion job. The
security cutoff is immediate. The existing seven-day cooling-off period is
preserved for destructive completion; verified session initiation records the
verification timestamp. The worker refuses unverified or not-yet-due requests.

The restricted worker calls only `complete_account_deletion(uuid)`. This
database-owned function locks the request, accepts retry from `failed`, and
atomically transitions to `processing` and then `completed`. Unexpected errors
roll back destructive changes, record `failed` plus a non-sensitive error code,
and cause retry. Failed deletion never restores access.

Audit events are `deletion_request`, `deletion_started`,
`deletion_completed`, and `deletion_failed`. They exclude tokens, credentials,
health content, and PII.

## Data disposition

| Area                                                                                  | Implemented disposition                                   |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Profiles, health entries, documents/storage metadata, imported records                | DELETE                                                    |
| Conversation membership and user-sent messages                                        | DELETE; only target-owned empty conversations are removed |
| Consents, notifications, exports, recovery/auth tokens                                | DELETE                                                    |
| Sessions                                                                              | REVOKE and retain non-secret security evidence            |
| Memberships, matching data, blocks, user roles, MFA enrollments                       | DELETE                                                    |
| User-created reports                                                                  | DELETE; moderation/subject references are detached        |
| User account                                                                          | ANONYMIZE and RETAIN a `deleted` tombstone                |
| Deletion request and lifecycle audit                                                  | RETAIN as pseudonymous operational evidence               |
| Role approvals, moderation/content-review history, backups, external provider objects | POLICY DECISION REQUIRED                                  |

## Verified

Automated tests cover actor-derived targeting, spoofed identifiers, idempotency,
session/token cutoff, cross-user safety, completion, data removal, forced RLS,
runtime-role attestation, and restricted background execution on PostgreSQL 16.

## Policy decision required

No production retention period, deletion SLA, legal-hold rule, backup expiry,
or external-provider propagation policy is approved. Approval is required
before production. No period or regulatory compliance is inferred. Physical
provider-object deletion must be added with a production storage adapter and
approved propagation policy; database access is removed atomically today.

## Reconciliation safeguards

Legacy duplicate open requests are reconciled before the unique index, retaining
the strongest legal hold and longest cooling-off interval. Only cancelled duplicate
rows remain as history. A stable user-row lock serializes concurrent requests.
The function uses explicit owner-only RLS policies scoped to a transaction-local
execution flag, restored before return; runtime roles cannot assume that owner or
activate its policies by setting the same flag. Normal non-superuser migrator
ownership is tested. Cancelled, held, unverified and future-due requests never
become retryable `failed` requests. Moderation references are detached before
removing reports. Unrelated empty conversations remain intact. Conversations with
retained call references remain instead of causing a foreign-key failure.

Migration 007 is still an unmerged proposal and is corrected in this replacement.
Do not apply it over a database that ran the old PR #64 migration: its checksum
will intentionally fail. Such a non-production database needs a separately
reviewed roll-forward migration or a fresh disposable reset. No deployed database
was modified by this work.
