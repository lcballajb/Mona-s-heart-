# Phase 2 security, stability, and private beta assessment

Assessment: 2026-10-21. Repository: `lcballajb/Mona-s-heart-`.
Base: `main` at `00d1fe3426c9b753a613ab5939f8839c28c8135e`.
Working branch: `security/phase-2-beta-hardening`.

**Decision: NO-GO for real patients or real health information, including private beta.**
The changes below improve existing foundations; they do not complete the product,
establish operated safeguards, or establish HIPAA compliance.

## Scope, evidence, and preserved work

Inspection covered the tracked repository structure, frontend routes and state,
backend HTTP/service/store boundaries, all six migrations and RLS policies,
authentication, document/storage/scanner implementations, worker entry point,
notifications, matching, tests, workflows, deployment configuration, and existing
architecture/security/operations documentation. This is an engineering assessment,
not an exhaustive penetration test or a completed Codex Security scan. The scan
skill's shared preflight reference was unavailable; no formal scan artifact or
successful scan completion is claimed. No production service or patient dataset
was accessed. Test data and database credentials are synthetic and disposable.

The checkout was clean before work. A fresh fetch confirmed the base equals
`origin/main`. GitHub branch and PR searches found existing work, including:

- Merged [PR #62](https://github.com/lcballajb/Mona-s-heart-/pull/62): fail-closed runtime-role attestation.
- Merged [PR #46](https://github.com/lcballajb/Mona-s-heart-/pull/46): imported-document ownership and owned-data RLS.
- Merged [PR #34](https://github.com/lcballajb/Mona-s-heart-/pull/34): forced sensitive-table RLS.
- Merged [PR #33](https://github.com/lcballajb/Mona-s-heart-/pull/33): sibling recovery-token invalidation.
- Open [PR #35](https://github.com/lcballajb/Mona-s-heart-/pull/35): actor-context wrappers for user-owned PostgreSQL operations; search reported conflicts. Review/reconcile before acceptance; it was not merged or duplicated.
- Open [PR #64](https://github.com/lcballajb/Mona-s-heart-/pull/64): account-deletion lifecycle. Its implementation remains outside main and was not merged or duplicated.

Other feature and dependency branches were observed and left untouched. This PR
updates dependency versions within the existing router/Vite majors without
merging dependency branches. Historical inventory documents remain historical.
The combined-status API returned no statuses for the base; this does **not** prove
that Actions ran or passed. Branch protection, deployments, security alerts, and
operational controls were not independently established.

## Current application and feature inventory

Implemented means executable code exists with the specified local evidence;
partial/demo does not mean available to a real user.

| Area                                  | Current status and evidence                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture                          | React 18/TypeScript/Vite PWA with a large `src/main.tsx`; separate Node HTTP API, memory/PostgreSQL stores, and worker. Frontend API use is principally terminology lookup.                                                                                                                                                            |
| Authentication                        | Backend registration, public role restriction, scrypt, verification, recovery, lockout, cookie sessions, CSRF, password change and revocation exist. Unit, PostgreSQL and new HTTP journey evidence pass. Production delivery/identity operations remain unconfigured.                                                                 |
| Patient/survivor/caregiver onboarding | Public roles exist server-side. Frontend auth and onboarding navigate through demonstration screens without creating an authenticated account or persisting onboarding. Forgot-password UI also does not deliver a reset email.                                                                                                        |
| Profiles and account editing          | Screens and store methods exist; profile HTTP CRUD and frontend persistence are missing. Main's PostgreSQL profile/health/document methods require explicit actor transactions from their caller; ordinary calls can fail RLS. See PR #35.                                                                                             |
| Diagnosis/symptom matching            | Demo cards and explainable matching helper exist; no persisted, consent-aware matching service. Helper does not enforce blocked IDs or visibility, so it must not become an authorization boundary.                                                                                                                                    |
| Medication saving                     | Explicit UI confirmation and provenance/search abstractions exist; changes are local UI state rather than authenticated durable saves.                                                                                                                                                                                                 |
| Conversations/private messages        | Demo conversation screens, schema, membership RLS, and service ownership examples exist. Conversation/message API, PostgreSQL CRUD contract, persistent delivery and membership lifecycle are incomplete.                                                                                                                              |
| Video                                 | Demonstration call room; feature defaults off. No approved provider, signaling, TURN or call authorization/token lifecycle.                                                                                                                                                                                                            |
| Support groups/moderation             | Demonstration group UI, report/block primitives and draft governance. No complete persisted participation/moderation workflow or staffed escalation.                                                                                                                                                                                   |
| Medical documents                     | Memory-only document service enforces owner lookup and quarantine; mock URLs are short-lived. It directly uses `store.documents`, so it is not a PostgreSQL production workflow. HTTP routes, production signed policy constraints, content sniffing, actual-byte/checksum verification, KMS/scanner/provider integration are missing. |
| Notifications                         | User-scoped schema/store primitives and demo list; delivery handlers and end-to-end participation flows are missing.                                                                                                                                                                                                                   |
| Privacy lifecycle                     | Export/deletion requests and queued jobs exist; default worker has no handlers. Export delivery/deletion completion are not operational on main. Review PR #64 and approve retention/legal-hold rules.                                                                                                                                 |
| Database                              | Six checksum-tracked migrations; parameterized SQL; forced RLS on twelve protected tables; restricted runtime-role provisioning and startup attestation. Fresh synthetic PostgreSQL 16 suite passes; this is not a complete resource/action matrix.                                                                                    |
| CI and deployment                     | CI declares Node 24, PostgreSQL, migrations, seeds, security tests, build, checks and dependency review. Staging Compose is a template using placeholder configuration; production providers intentionally fail closed. No deployment performed.                                                                                       |
| UX/accessibility                      | Existing labels, keyboard autocomplete, mobile CSS, empty/error messaging and privacy notices are useful foundations. No automated browser/assistive-technology audit or WCAG conformance evidence.                                                                                                                                    |

## Security findings, ranked

No critical exploit was validated in this bounded assessment. This is not proof
that critical vulnerabilities are absent. Severity below describes the demonstrated
application impact; package advisory severity is recorded separately.

| Severity                                                  | Finding and vulnerable boundary                                                                                                                                                                                                                                                                                           | Disposition/evidence                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High                                                      | An unexpired session continued resolving an actor after the account became deactivated, deletion-pending, deleted, or unverified. A soft-deleted row with inconsistent active status could also remain eligible. Every protected HTTP route trusts this actor resolution. The attacker needs a previously issued session. | Fixed at `MonaService.actor`: require active, verified, non-deleted user on each resolution. PostgreSQL mapping now exposes `deletedAt`. Synthetic tests cover states, missing user, normal active user, and HTTP denial after deactivation.                                                                                                      |
| Medium                                                    | `redact` only filtered top-level key names. Nested payloads under generic fields, email and raw error request paths could reach logs; circular nested values could also break serialization. Metric labels used the same filter.                                                                                          | Fixed with an explicit bounded scalar operational-field allowlist and removal of raw HTTP path from error telemetry. Regression demonstrates nested/array/circular data is omitted while event/status/request correlation survive. Approved scalar fields still require callers to provide operational values; this is not arbitrary-content DLP. |
| High advisory severity; application exploitability varies | Network-backed npm audit reported eight vulnerable packages (seven high, one moderate), including Vite/esbuild, router/turbo-stream and transitive utilities. Not every advisory applies to this SPA; no application-level exploit is claimed from advisory presence alone.                                               | Updated Vite 6.0.5 → 6.4.5 and react-router-dom 7.1.1 → 7.18.4, refreshed compatible transitive packages without force/major upgrades. Follow-up network audit: zero known vulnerabilities. Build and existing checks pass.                                                                                                                       |

Release-blocking security gaps remain: a complete routed ownership/role/tenant
matrix; reliable actor-context integration; approved health encryption/KMS; real
storage/scanner constraints; provider identity/IAM; operational audit retention;
account lifecycle completion; independent adversarial review. Unrouted prototype
methods must not be exposed directly as public resource APIs.

## Confirmed defects and completed changes

1. Existing-session eligibility bug: regression failed on a deactivated account
   before the patch, then passed for all tested lifecycle states. Active accounts,
   revocation, expiry, recovery and password-change behavior remain covered.
2. Telemetry disclosure/serialization bug: regression failed because sensitive
   nested fields and paths survived the old filter, then passed for logs and metric
   labels. Event metadata remains available; arbitrary new telemetry fields now
   require explicit review and allowlisting.
3. Known vulnerable dependency versions: current network audit went from eight
   advisories to zero following compatible updates. No forced audit remediation.
4. Documentation incorrectly described the repository as entirely frontend-only;
   `docs/KNOWN_LIMITATIONS.md` now distinguishes implemented backend foundations
   from missing product integration and production services.

Additional confirmed implementation gaps are listed in the inventory rather than
presented as completed features. No functioning screen was redesigned or replaced.

## Modified files and purpose

| Files                                                                | Purpose                                                                                                                                                        |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/service.mjs`, `server/postgres-store.mjs`                    | Enforce current account eligibility at session-to-actor boundary, including soft deletion.                                                                     |
| `server/observability.mjs`, `server/index.mjs`                       | Reject arbitrary/nested telemetry fields and stop passing raw request paths.                                                                                   |
| `tests/backend.test.mjs`                                             | Regression for inactive/unverified/deleted/missing accounts and active control.                                                                                |
| `tests/operations.test.mjs`                                          | Regression for nested/array/circular payloads, email/path removal, and useful log/metric preservation.                                                         |
| `tests/postgres.integration.test.mjs`, `tests/http-auth-journey.mjs` | Real PostgreSQL lifecycle assertions and real HTTP cookie/CSRF/cross-user revocation/deactivation/logout journey. Uses existing mandatory CI PostgreSQL suite. |
| `package.json`, `package-lock.json`                                  | Compatible patched direct versions and transitive lock refresh.                                                                                                |
| `docs/KNOWN_LIMITATIONS.md`, `docs/README.md`, this document         | Accurate current limitations, report index and reviewable beta evidence/checklist.                                                                             |

## Verification results

Node 24.19.0; disposable PostgreSQL 16; separate migrator and attested restricted
runtime roles; fictional accounts only. Commands ran locally against the candidate.

| Check                                                                                            | Actual result                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline `npm test`                                                                              | Passed at file level; default sandbox reporter hid individual subtests. PostgreSQL was not configured for this initial run. Not used as database verification evidence. |
| Added regressions before fixes (`node tests/backend.test.mjs`, `node tests/operations.test.mjs`) | Failed as intended: one deactivation assertion and one telemetry assertion.                                                                                             |
| `npm ci --offline --cache /workspace/.npm-cache --ignore-scripts --fetch-retries=0`              | Passed. Default cache attempt failed with ENOTCACHED; first restricted-network install was stopped. Explicit workspace cache resolved installation.                     |
| `npm run db:migrate`                                                                             | All six migrations applied successfully to an empty disposable database.                                                                                                |
| `npm run db:seed` twice                                                                          | Passed; synthetic seed idempotency exercised.                                                                                                                           |
| `npm run db:provision-runtime`                                                                   | Passed; runtime role is distinct from administrative migrator.                                                                                                          |
| `npm test` with required PostgreSQL configuration                                                | 61 passed, zero failed, zero skipped, including actual HTTP journey and PostgreSQL suite.                                                                               |
| `npm run test:postgres`                                                                          | Passed; mandatory suite executes without skips.                                                                                                                         |
| `npm run typecheck`, `npm run lint`, `npm run format:check`                                      | Passed.                                                                                                                                                                 |
| `npm run audit:repository`                                                                       | Passed. This checks repository hygiene, not security completeness.                                                                                                      |
| `npm run build`                                                                                  | Passed. Router emits nonblocking ignored `use client` bundle-directive warnings.                                                                                        |
| Network-backed `npm audit`                                                                       | Baseline exit 1: eight advisories. After updates: zero known vulnerabilities. Offline audit output was not accepted as advisory evidence.                               |
| `git diff --check`                                                                               | Passed.                                                                                                                                                                 |
| Backup/restore scripts                                                                           | Dry runs only; no operated backup/restore claim.                                                                                                                        |
| Browser E2E, accessibility, load/soak, live provider tests                                       | Not executed; missing product integration/provider setup remains blocking.                                                                                              |
| Remote CI                                                                                        | Must be checked on the PR; local results do not assert remote success.                                                                                                  |

An intermediate lint run rejected an unlisted Node `AbortSignal` global in the
new HTTP test; it was corrected by using `globalThis.AbortSignal`, then lint was
rerun. No failing test was disabled, weakened, or bypassed. PostgreSQL integration remains
mandatory in CI. No migration was rewritten or added by this change.

## Beta readiness checklist

Unchecked blocking items prevent invitations with real personal or health data.

| Blocking gate                | Required acceptance evidence                                                                                                                                  | Current result                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Ownership and privilege      | Routed owner/other-user/anonymous/admin/tenant allow-and-deny matrix under actual runtime role; review/reconcile PR #35                                       | Partial; broader matrix missing                      |
| Account journeys             | Browser registration, verification, patient/survivor onboarding, profile edit, medication save, recovery and logout with durable state and clear errors       | Missing frontend integration                         |
| Private communications       | Authorized conversation membership, encrypted persistence, block/report enforcement, moderation escalation; explicitly exclude video if unready               | Incomplete                                           |
| Documents                    | Approved vendor and signed policies, MIME/size/checksum verification, quarantine-to-clean lifecycle, owner-only access, expiring URLs, retention and deletion | Mock only                                            |
| Privacy lifecycle            | Approved consent, policy notices, export delivery, deletion completion, legal holds, retention and backup expiration; reconcile PR #64                        | Incomplete                                           |
| Infrastructure/secrets       | Approved region/vendors, IAM/KMS, TLS/proxy rehearsal, secret injection/rotation, network restrictions, migration/rollback rehearsal                          | Unverified/unconfigured                              |
| Monitoring/incident response | PHI-conscious sink access/retention, dashboards, alert tests, named on-call, incident and breach-response exercises                                           | Draft/unoperated                                     |
| Backups/recovery             | Encrypted backups, isolated witnessed restore, RLS/data verification and measured RPO/RTO                                                                     | Dry-run tooling only                                 |
| Accessibility/mobile         | Keyboard, focus, screen reader, contrast, zoom and small-screen testing on critical authenticated journeys; remediate blockers                                | Not verified                                         |
| Supply chain/release         | Current audit/SBOM/container/secret scan evidence, CI pass on exact commit, branch protections, independent security review and release approval              | Local audit improved; remaining evidence outstanding |
| Legal/clinical/operations    | Named owners, staffed moderation/support, applicable privacy/health obligations and vendor agreements approved                                                | Requires human review                                |

Nonblocking enhancements after those gates: split the large frontend module;
expand visual polish and localization; optimize bundles; add optional integrations
only behind approved scope/flags. AI, EHR/FHIR, minors, research and video stay off
until their own safeguards and approvals exist. No public deployment or invitations
are authorized by this assessment.

## HIPAA and operational safeguards

Counsel/privacy leadership must determine whether the operator is a covered entity
or business associate for each deployment/relationship; health-related software
alone does not settle HIPAA applicability. Where applicable, address Privacy,
Security and Breach Notification Rules, vendor/subprocessor BAAs, permitted uses
and minimum necessary access, risk analysis and risk management, workforce
training/access reviews/sanctions, physical/device controls, incident handling and
notification, contingency planning, record retention and documented accountability.
Non-HIPAA deployments can still have FTC/state consumer-health/privacy obligations;
assess those and geography-specific requirements. Draft policies and passing tests
are not evidence these administrative, physical and operational safeguards work.

## Recommended next milestone

Complete a synthetic-data authentication and onboarding vertical slice. First
review/reconcile the existing actor-context and deletion PRs against current main.
Then connect the existing UI to versioned auth/profile/health APIs, derive identity
only from server sessions, and prove patient/survivor onboarding and durable
medication saving in browser E2E with permission-denied, loading, empty and error
states. Keep messaging/documents/video gated until separately verified. Require
fresh runtime-role PostgreSQL, HTTP and browser evidence plus accessibility review
before reconsidering a real-data private beta.
