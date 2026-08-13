# P0 authenticated actor and RLS audit

Date: 2026-08-13. Baseline: `7a6a27b` (PR #45 inventory commit available in
the supplied checkout).

## Audit findings

The HTTP layer resolves a session token to an actor before protected account
routes call the service. Service methods generally derive user ownership from
`actor.id`. PostgreSQL actor settings are transaction-local. However, many
store methods execute owner-table statements without an actor transaction, and
the runtime and migration credentials are not yet independently provisioned or
tested. The architecture therefore is **not P0 verified**.

## Actor-context inventory

| Area                    | Classification | Evidence / gap                                                                                                                                    |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| profiles                | PARTIAL        | Owner policy exists; store write lacks actor transaction.                                                                                         |
| health entries          | PARTIAL        | Forced owner RLS exists; store methods lack actor transaction.                                                                                    |
| documents               | PARTIAL        | Service derives owner; store methods lack actor transaction.                                                                                      |
| imported records        | PROTECTED      | Store sets transaction-local actor and atomically requires a live same-owner document; RLS repeats the check.                                     |
| conversations           | PARTIAL        | Forced member-read policy exists; no safe creation/bootstrap operation exists.                                                                    |
| conversation members    | PARTIAL        | Owner/member RLS added, but no authorized invitation/bootstrap design exists.                                                                     |
| messages                | PARTIAL        | Forced member policy exists; no complete persistence API or adversarial matrix exists.                                                            |
| consents                | PARTIAL        | Service derives owner and owner RLS added; store write lacks actor transaction.                                                                   |
| notifications           | PARTIAL        | Owner RLS added; producer authorization and actor transaction are absent.                                                                         |
| exports                 | PARTIAL        | Service derives owner and owner RLS added; store transaction does not set actor.                                                                  |
| account deletion        | PARTIAL        | Service derives owner and owner RLS added; store transaction does not set actor.                                                                  |
| organization membership | PARTIAL        | Forced organization scope exists, but caller-supplied organization context is accepted by the store and administrative authorization is external. |

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

Role creation does **not** belong in normal application migrations. Bootstrap
or infrastructure provisioning must create the runtime identity as `LOGIN
NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`, own
no application tables, and grant only required DML/sequence privileges.
`DB_ADMIN_URL` must be used exclusively by migration/bootstrap commands;
`DATABASE_URL` must be the runtime credential. The repository currently uses
`DATABASE_URL` for migrations and CI runs the application as the PostgreSQL
service owner, so this boundary is UNPROTECTED and remains a P0 blocker.

## Required adversarial matrix and gaps

| Case                                     | Result                                                  |
| ---------------------------------------- | ------------------------------------------------------- |
| User A reads/updates/deletes User B data | BLOCKED — real runtime-role PostgreSQL coverage missing |
| Cross-user imported document reference   | Unit PASS; PostgreSQL BLOCKED                           |
| Spoofed owner ID                         | Unit PASS for persisted `userId`; PostgreSQL BLOCKED    |
| No actor context                         | BLOCKED — PostgreSQL coverage missing                   |
| Runtime role bypasses RLS                | BLOCKED — separate role absent                          |
| Runtime role modifies schema             | BLOCKED — separate role absent                          |
| Same-user operations                     | Unit PASS; complete PostgreSQL matrix BLOCKED           |

The PostgreSQL command now fails rather than silently skipping when
`TEST_DATABASE_URL` is absent. CI has PostgreSQL 16, but must be redesigned to
run migrations with `DB_ADMIN_URL`, provision an unprivileged runtime role, and
execute the security suite through `DATABASE_URL`.

## P0 vulnerabilities and required fixes

1. Provision and test distinct admin and runtime identities outside migrations.
2. Put every user-owned store operation in an actor-context transaction.
3. Add real PostgreSQL adversarial CRUD, identity, role-attribute, bypass, DDL,
   document-deletion, and rollback assertions.
4. Design atomic conversation creation plus creator membership without allowing
   arbitrary self-join.
5. Replace caller-selected organization RLS context with memberships resolved
   from trusted authenticated identity and authorized administrative workflows.
6. Extend RLS analysis to other sensitive/user-linked tables before exposing
   new routes.

P0 SECURITY ARCHITECTURE VERIFIED: NO
