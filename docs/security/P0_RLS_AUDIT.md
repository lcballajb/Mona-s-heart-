# P0 authenticated actor and RLS audit

Date: 2026-08-25. Baseline: PR #46 plus runtime database-role attestation.

## Audit findings

The HTTP layer resolves a session token to an actor before protected account
routes call the service. Service methods generally derive user ownership from
`actor.id`. PostgreSQL actor settings are transaction-local. The four reachable
consent/notification/export/deletion store operations execute in actor-context
transactions. CI independently provisions and tests a restricted runtime
login. API and worker store creation now attest that same runtime connection
before accepting work. Broader inventory gaps listed below remain outside this
remediation, so the repository-wide architecture is **not P0 verified**.

## Actor-context inventory

| Area                    | Classification | Evidence / gap                                                                                                                                                                          |
| ----------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| profiles                | PARTIAL        | Owner policy exists; store write lacks actor transaction.                                                                                                                               |
| health entries          | PARTIAL        | Forced owner RLS exists; store methods lack actor transaction.                                                                                                                          |
| documents               | PARTIAL        | Service derives owner; store methods lack actor transaction.                                                                                                                            |
| imported records        | PROTECTED      | Store sets transaction-local actor and atomically requires a live same-owner document; RLS repeats the check.                                                                           |
| conversations           | PARTIAL        | Forced member-read policy exists; no safe creation/bootstrap operation exists.                                                                                                          |
| conversation members    | PARTIAL        | Owner/member RLS added, but no authorized invitation/bootstrap design exists.                                                                                                           |
| messages                | PARTIAL        | Forced member policy exists; no complete persistence API or adversarial matrix exists.                                                                                                  |
| consents                | VERIFIED       | Service derives the owner from `actor.id`; the store sets transaction-local actor context and real PostgreSQL tests cover same-user, cross-user, and missing-context writes.            |
| notifications           | VERIFIED       | Service derives the owner from `actor.id`; the store sets transaction-local actor context and real PostgreSQL tests cover same-user, cross-user read/write, and missing-context writes. |
| exports                 | VERIFIED       | Service derives the owner from `actor.id`; the complete store transaction sets actor context and real PostgreSQL tests cover same-user, cross-user read/write, and missing context.     |
| account deletion        | VERIFIED       | Service derives the owner from `actor.id`; the complete store transaction sets actor context and real PostgreSQL tests cover same-user, cross-user read/write, and missing context.     |
| organization membership | PARTIAL        | Forced organization scope exists, but caller-supplied organization context is accepted by the store and administrative authorization is external.                                       |

No conversation creation operation exists, so conversation bootstrap is not
applicable to current reachable behavior. It must not be added until creator
membership can be inserted atomically without a permissive self-join policy.

## RLS findings

Migration 006 closes missing RLS on conversation membership, consent,
notification, export, and deletion tables and fails closed when `app.user_id`
is absent. Existing forced RLS covers profiles, health entries, documents,
imports, conversations, and messages. Real PostgreSQL evidence is still
required for read/update/delete denial, `current_user`/`session_user`, table
ownership, missing context, and all policy interaction claims.

## Database-role findings

Role creation remains outside ordinary application migrations. CI migrations
and seeds use `DB_ADMIN_URL`, then a bootstrap command creates/alters the runtime
identity as `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION
NOBYPASSRLS`, revokes public schema creation, and grants connect, schema usage,
required table DML, and sequence access. Application and security tests use the
restricted `DATABASE_URL`/`TEST_DATABASE_URL`. PostgreSQL 16 execution verified
distinct identities, false role capability flags, no table/schema ownership,
DDL denial, and FORCE-RLS bypass denial.

Runtime startup now fails closed unless the effective and session roles match
`DB_RUNTIME_USER` and catalog evidence proves the role and its assumable roles
have no privileged attributes, cannot create objects in the database or
application schema, and neither owns nor can truncate any protected RLS table.
The protected inventory must remain complete with forced RLS enabled.
The query runs through the ordinary application pool and
returns only a generic failure. Real PostgreSQL 16 tests cover the accepted
role plus superuser, bypass-RLS, role/database creator, schema creator,
protected-table owner, unexpected identity, missing identity, and
unverifiable-connection rejection.

## Required adversarial matrix and gaps

| Case                                                  | Result                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Cross-user owned consent/notification/export/deletion | PASS — RLS rejects writes and hides reads where applicable                |
| Cross-user, deleted, or missing imported document     | PASS — PostgreSQL rejects each attempt and inserts zero unauthorized rows |
| Spoofed imported-record owner ID                      | PASS — mismatched actor context is rejected by RLS                        |
| No actor context                                      | PASS — owned writes fail closed                                           |
| Runtime role bypasses RLS                             | PASS — `row_security=off` cannot bypass forced policy                     |
| Runtime role modifies schema                          | PASS — runtime `CREATE TABLE` is denied                                   |
| Runtime startup with privileged or unexpected role    | PASS — attestation rejects each tested unsafe identity                    |
| Runtime role owns or can assume a protected owner     | PASS — attestation rejects protected-table ownership                      |
| Same-user operations                                  | PASS — mandatory PostgreSQL matrix executed                               |

The dedicated PostgreSQL command fails rather than silently skipping when
`TEST_DATABASE_URL` or `DB_ADMIN_URL` is absent. CI uses PostgreSQL 16, performs
admin-only migration/seed/bootstrap, and executes the mandatory security suite
through the restricted runtime credential.

## P0 vulnerabilities and required fixes

The PR #46 actor-context and credential-separation controls plus runtime
startup role attestation are verified by a real PostgreSQL 16 execution with
zero skipped mandatory tests. Remaining repository-wide work is:

1. Put other user-owned store operations identified as PARTIAL above in actor-context transactions before exposing them through new routes.
2. Design atomic conversation creation plus creator membership without allowing
   arbitrary self-join.
3. Replace caller-selected organization RLS context with memberships resolved
   from trusted authenticated identity and authorized administrative workflows.
4. Extend RLS analysis to other sensitive/user-linked tables before exposing
   new routes.

P0 SECURITY ARCHITECTURE VERIFIED: NO
