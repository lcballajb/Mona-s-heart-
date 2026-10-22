# Pull-request reconciliation report

Completed October 21, 2026 (America/Chicago). Repository: `lcballajb/Mona-s-heart-`.
Synthetic data only; no deployment, real-patient enablement or compliance claim.

## Disposition and merge order

| Original PR                                                 | Original reviewed head                     | Verdict and final action                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#143](https://github.com/lcballajb/Mona-s-heart-/pull/143) | `26f659cb7cac5b7011e5ee08b90058fc4d950c48` | Safe for this bounded synthetic prototype after independent review and fresh checks. Merged first as `7a1bf981ad10909380a37e4db507275415b7fade`.                                                                                                                                                                                |
| [#35](https://github.com/lcballajb/Mona-s-heart-/pull/35)   | `ef747317cfcb1a20a14ff0b49152247d34795834` | Do not merge original: conflicts with main; obsolete CI/ownership context. Reconciled in [#144](https://github.com/lcballajb/Mona-s-heart-/pull/144), head `9c2138d4c3608dbe44885b76fed28acc376b5346`; merged second as `deb0112cbf3d525a5066d9bda0cedf5d7f696a0b`. Original closed as superseded.                              |
| [#64](https://github.com/lcballajb/Mona-s-heart-/pull/64)   | `c6c897c255843db1baf81721352caf7e631b84b7` | Do not merge original: confirmed lifecycle, ownership and reference defects despite green historical CI. Reconciled in [#145](https://github.com/lcballajb/Mona-s-heart-/pull/145), head `01326b3c39d18b2bb074b80329612d80689c3677`; merged third as `3eb7679147c7ec171166b9183f684f568db7e81f`. Original closed as superseded. |

Separate correction branches are `fix/pr35-rls-reconciliation` and
`fix/pr64-deletion-reconciliation`. Neither original source branch was rewritten
or deleted. Existing staged PR #64 work was checkpointed locally before changes;
the existing PR #35 reconciliation commit was preserved. No reset, destructive
checkout or deletion of previous functionality was used.

## Scope and overlap

Inspected the complete original diffs: #143 has 13 files, #35 has 6, and #64 has 10. Review included changed callers, auth/service/store boundaries, all database
migrations/RLS policies, worker behavior, store contract, runtime provisioning,
workflow definitions, manifests/lockfile and tests. This is a bounded engineering
and security-implication review, not an exhaustive penetration test.

All three touch `server/postgres-store.mjs` and the PostgreSQL integration suite.
#143 and #64 also touch service/account behavior and backend tests. #35's old CI
role setup overlaps with later merged runtime-role protections; its old import
insert omitted the current owner-filtered validation. The replacement preserves
current CI, #46 ownership checks, #62 role attestation and #143 eligibility and
telemetry fixes, while adding #35's `asUser` context wrappers. Historical planning
copy from #35 is superseded by the current implementation contract rather than
restoring obsolete readiness statements.

Only #143 changes npm dependencies. Vite moves 6.0.5 to 6.4.5 and
react-router-dom 7.1.1 to 7.18.4 with compatible lockfile transitive updates,
including esbuild. No forced major upgrade or unrelated dependency branch merge.
Fresh network-backed `npm audit --json` returned zero known vulnerabilities.
This is not an assertion that every GitHub security alert or application risk is
resolved. Neither replacement adds a package or downgrades the merged lockfile.

## Independent PR #143 findings

- Session actor resolution now checks current `active` status, verification and
  absence of `deletedAt` on every resolution. PostgreSQL mapping exposes the
  deletion timestamp. The memory and PostgreSQL tests cover inactive,
  deletion-pending, deleted, unverified, inconsistent soft-deleted and missing
  accounts; active sessions remain usable. Existing expiry, logout, revocation,
  recovery/password-change and role restrictions remain covered.
- Ordinary log fields and metric labels now accept bounded scalar operational
  allowlisted fields. Nested objects, arrays, circular objects, email and raw
  paths are omitted. The HTTP error caller no longer passes a request path.
  Reviewed production callers use fixed event names and operational values.
  This is not arbitrary-content DLP: future callers must not put patient content
  inside allowed scalar fields or event names.
- The HTTP regression uses a real API child and disposable PostgreSQL, checking
  unauthenticated rejection, wrong password, cookie attributes, CSRF denial,
  cross-user session-revocation denial, deactivation and logout. It does not
  establish browser accessibility or complete product onboarding.
- Independently ran the new session and telemetry regression tests against main
  before #143: both failed for the intended defects. Both pass on #143. The
  baseline reproduction used an isolated detached worktree, preserving main.

No additional merge-blocking finding was confirmed in #143's bounded change.
Its local suite passed 61/61 with no skips, plus mandatory PostgreSQL and the
static/build/audit checks. Required GitHub jobs also passed at the reviewed head.

## Confirmed defects fixed in reconciliation

| Severity | Defect                                                              | Correction and evidence                                                                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | #35 conflicts with current ownership and runtime-role work          | Reapplied actor-context wrappers on the hardened tree; retained owner-filtered import insertion, RLS and current CI; tests reject mismatched context and foreign document IDs.                                                                                                     |
| Medium   | Preserved #35 reconciliation declared `otherActor` twice            | Initial local suite could not parse its PostgreSQL test; removed duplicate declaration; all 62 tests and mandatory PostgreSQL pass.                                                                                                                                                |
| High     | #64 definer ownership alone does not bypass forced RLS              | Explicit schema-owner-only execution policy with transaction-local flag, restored on return; real non-superuser/NOBYPASSRLS migrator test proves completion; runtime setting the same flag still cannot read requests. No broad runtime DELETE grant or admin credential fallback. |
| High     | Cancelled/held requests become failed and then executable           | Guard states before destructive exception handling; repeated attempts preserve cancellation and hold; unverified/future requests also fail closed.                                                                                                                                 |
| High     | Global cleanup deletes unrelated empty conversations                | Capture target memberships and restrict empty cleanup to those conversations; preserve conversations with retained call references. Test proves unrelated empty conversation survives.                                                                                             |
| High     | Existing moderated reports block deletion through foreign key       | Detach moderation-action report references before deleting target-authored reports; test proves completion and reference detachment.                                                                                                                                               |
| High     | Legacy duplicate open requests abort unique-index migration         | Reconcile duplicates first, retaining strongest hold and longest cooling-off interval, with cancelled rows retained as history. Upgrade test seeds old duplicate data before migration 007 and repeats migration.                                                                  |
| Medium   | Concurrent request checks cannot lock a missing row                 | Lock stable user row before checking requests. Four parallel requests return the same request ID and retain one job.                                                                                                                                                               |
| Medium   | Memory adapter retains block/report relationships                   | Remove both block directions and own reports; detach subject/moderation references; test proves unrelated user stays active.                                                                                                                                                       |
| Medium   | Store contract accepts adapters lacking worker completion           | Add `completeDeletionRequest`; startup contract test rejects a missing implementation before accepting jobs.                                                                                                                                                                       |
| Medium   | Tombstone retains MFA enrollment secrets                            | Delete target MFA enrollment rows and clear account secret; PostgreSQL test confirms no enrollment remains.                                                                                                                                                                        |
| Medium   | #64 silently replaces seven-day cooling-off with immediate deletion | Preserve existing interval; immediate credential cutoff remains; verified session initiation records verification, and worker refuses early/unverified execution. Tests fast-forward synthetic request timestamps only.                                                            |

Unexpected destructive-work failure rolls back the deletion subtransaction and
records a content-free failure code. The existing failure-injection trigger test
proves profile retention and continued access cutoff, followed by safe retry.

## Fresh validation evidence

Environment: Node 24.19.0; PostgreSQL 16.15; disposable databases; separate schema
migrator and restricted runtime roles; synthetic `.test` accounts. The additional
lifecycle suite also creates a non-superuser schema owner and a separate runtime,
then drops its disposable database and roles. The container lacks mapped non-root
OS identities, so the local PostgreSQL process used a temporary host-only UID shim;
SQL roles, forced RLS, privileges and assertions remained real. Remote Actions
independently runs the normal PostgreSQL 16 container without this local workaround.

| Reviewed tree    | Fresh `npm test`        | Mandatory PostgreSQL | Required remote CI                                                                                                                  |
| ---------------- | ----------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| #143 head        | 61 pass, 0 fail, 0 skip | Pass                 | [Run 39686940148](https://github.com/lcballajb/Mona-s-heart-/actions/runs/39686940148): `verify` and `dependency-review` successful |
| #144 replacement | 62 pass, 0 fail, 0 skip | Pass                 | [Run 39721635841](https://github.com/lcballajb/Mona-s-heart-/actions/runs/39721635841): both successful                             |
| #145 replacement | 66 pass, 0 fail, 0 skip | Pass                 | [Run 39721781134](https://github.com/lcballajb/Mona-s-heart-/actions/runs/39721781134): both successful                             |

Commands: `npm run db:migrate`, repeat migration/seed, `npm run db:provision-runtime`,
`npm test`, `npm run test:postgres`, `npm run lint` (includes typecheck),
`npm run format:check`, `npm run audit:repository`, `npm run build`,
`git diff --check`; #143 additionally `npm audit --json`. Remote workflow step
results confirm typecheck and dry-run backup/restore too. Dry runs are not an
operated backup or recovery exercise. React Router emits nonblocking build
warnings about ignored `use client` directives. No actual backup/restore or
browser patient journey is claimed.

Main's active ruleset requires `verify`, `dependency-review`, strict up-to-date
checks, resolved review threads and linear history. Its approval count is zero;
no rules bypass was used. Each merged head was SHA-pinned and had no review
threads at merge. The separate legacy branch-protection endpoint returned 403;
the readable active ruleset supplied the enforceable requirements.

## Remaining boundaries and exact next action

The existing frontend is still principally a demonstration. No claim that patient
onboarding, matching, messaging or groups now operate end to end. No branding or
visual routes were replaced during this reconciliation.

Migration 007 was corrected while still an unmerged proposal. A database that
previously ran original #64 cannot accept the replacement checksum; it requires
a separate reviewed roll-forward or a fresh disposable database. No deployed or
patient database was touched. External object deletion, approved retention/legal
hold policy, operated safeguards, providers/encryption, moderation staffing and
real-patient readiness remain unresolved release gates.

**Exact next action:** implement increment 1 of the
[authenticated patient journey contract](AUTHENTICATED_PATIENT_JOURNEY.md):
current-session/profile API DTOs, safe CSRF rehydration, owner-scoped profile reads
and writes, then connect the existing login shell and test actual reload/logout
behavior against a real local API and restricted PostgreSQL. Continue through
survivor discovery, accepted matching, member-only messaging and support groups
as one synthetic patient journey before adding unrelated features.
