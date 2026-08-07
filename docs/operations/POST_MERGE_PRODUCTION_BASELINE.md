# Post-merge stabilization and production baseline

**Assessment date:** 2026-08-07  
**Repository baseline:** `ffc1d2d` (the locally fetched `main` tip)  
**Decision:** **No-Go for production or real health data.** The repository is a
fictional-data prototype with useful control scaffolding, not evidence of a
deployed, approved, clinically validated, or compliant service.

## Scope, method, and evidence limits

The assessment reviewed all tracked application, API, worker, database,
deployment, workflow, test, policy, ADR, governance, AI/agent, accessibility,
security, privacy, compliance, reliability, and operations material. It also
reviewed the locally available Git history and merge messages for PRs 1, 2,
10–13, 15–18, 21, and 23–25. The local `FETCH_HEAD` identifies `ffc1d2d` as the
last fetched `main`, matching the starting commit.

GitHub was unreachable and no authenticated GitHub session or remote-tracking
refs were available. Consequently, open/closed PR metadata, review comments,
discussion threads, current checks, repository settings, and work merged after
the fetched baseline could not be independently retrieved or closed. This is a
blocking evidence gap, not evidence that those queues are empty. Before merge,
a maintainer must fetch `main`, inspect every PR review/discussion through the
GitHub UI/API, rebase if necessary, and record comment dispositions in the PR.

Repository scans found no unresolved merge markers or broken local Markdown
links. The documentation inventory had omitted three implemented engineering
documents; this increment indexes them and adds an automated regression gate.
No source TODO/FIXME/HACK marker requiring implementation was found. `TBD`
values in governance registers represent explicit human/vendor decisions and
must not be replaced with invented approvals.

## Evidence-based scores

Scores use repository evidence only. They do not assert regulatory compliance,
security certification, accessibility conformance, clinical safety, or runtime
effectiveness.

| Measure              | Score / 100 | Basis                                                                                                                                                                                                                                                   |
| -------------------- | ----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository health    |          69 | Coherent topology, lockfile, migrations, CI, tests, canonical docs, and automated structural audit; external PR/settings/advisory evidence unavailable.                                                                                                 |
| Production readiness |          38 | Fail-closed production configuration, PostgreSQL boundary, probes, shutdown, and runbooks exist; providers, production IaC, release evidence, SLOs, load/E2E evidence, and approvals do not.                                                            |
| Enterprise readiness |          25 | Tenant/RLS and hospital/FHIR architecture are documented; SSO/SCIM, tenant administration, partner validation, SLAs, procurement, and support operations are absent.                                                                                    |
| Security             |          64 | Secure session/CSRF/password patterns, authorization checks, TLS requirements, redaction, dependency review, and threat documentation exist; SAST, secret/container scanning, penetration results, IAM/KMS, SIEM, and settings evidence remain missing. |
| AI governance        |          65 | AI is disabled with empty allowlist, safety policies, registries, review gates, and rollback plans; no approved provider/model, runtime gateway, evaluation result, usage ledger, or audit evidence exists.                                             |
| Accessibility        |          43 | Semantic intentions, checklists, limitations, and an AT matrix exist; browser automation, automated accessibility checks, manual AT results, and independent review do not.                                                                             |
| Performance          |          28 | Bounded requests, database timeouts/pool, caching boundaries, and worker concurrency exist; budgets, browser profiling, load/soak results, capacity models, and production telemetry do not.                                                            |
| Reliability          |          45 | Health/readiness, graceful shutdown, job leases/retries, backup/restore dry-run paths, DR/BCP runbooks, and PostgreSQL CI exist; real restores, SLOs, alerts, failover/game-day evidence, and on-call staffing do not.                                  |
| Maintainability      |          66 | Typed frontend, focused backend modules, adapters, migrations, lint/format/tests, ADRs, and canonical documentation help; monolithic UI, manual API contract, incomplete adapter behavior parity, and broad unstaffed registers remain debt.            |

## Cross-domain consistency assessment

| Domain                           | Verified baseline                                                                                                                                                                   | Remaining gap or approval                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture and implementation  | React/Vite PWA, Node HTTP API/worker, PostgreSQL production adapter, and provider boundaries agree with ADR-002/004/005. No competing framework or native implementation was found. | Production topology/IaC and provider selections require architecture, platform, security, and privacy approval.                                                       |
| Backend, API, jobs, data         | Bounded HTTP handling, authentication lifecycle, service/store layers, migrations, RLS foundation, durable jobs, and adapter operation contract are tested.                         | Versioned API schema, behavioral store parity, complete RLS/capability matrix, lifecycle execution, concurrency/load evidence, and migration rehearsal remain.        |
| Frontend and accessibility       | PWA/privacy defaults and high-risk feature flags align with the fictional-data boundary.                                                                                            | Authenticated client flows, error boundaries, browser E2E, automated a11y, manual keyboard/AT evidence, and performance budgets remain.                               |
| Authentication/authorization     | Normalized input, peppered sessions, CSRF, lockout, verification/reset/change/revocation, role approvals, ownership, and organization checks exist.                                 | MFA decision, reviewed email delivery, complete centralized authorization/RLS coverage, adversarial IDOR tests, and independent review remain.                        |
| AI and multi-agent               | Both are architecture/governance artifacts; AI defaults off and agent execution is not implemented, consistent with approval gates.                                                 | Provider/model/use-case approvals, governed gateway, evaluation/audit/cost controls, then synthetic-only agent prerequisites are blocking.                            |
| Infrastructure and CI/CD         | Separate images, staging Compose, nginx, migrations, PostgreSQL CI, dependency review, and maintenance workflows exist.                                                             | Production IaC, immutable action pins/artifacts, SAST/secret/image scans, deployment environments, canary/rollback evidence, and verified branch settings remain.     |
| Observability and runtime health | Redacted structured logging, provider/readiness checks, error-monitoring boundary, and shutdown behavior exist.                                                                     | Metrics/traces backend, approved telemetry schema, SLO dashboards, alert routing, synthetics, SIEM, on-call, and incident exercises remain.                           |
| Security/privacy/compliance      | Threat, data-flow, classification, retention, consent, policy, risk, and SDLC artifacts consistently prohibit claims of approval.                                                   | Qualified legal/privacy/regulatory/security decisions, actual vendor/data inventory, contracts, control operation evidence, and independent assessments remain.       |
| Documentation/governance         | ADRs, canonical map, risk/debt registers, runbooks, Go/No-Go, and fictional-data status are consistent.                                                                             | Named accountable people, dated approvals, evidence links, review minutes, PR-thread dispositions, and external link revalidation remain.                             |
| DR/business continuity           | Backup, restore, DR, BCP, rollback, shutdown, and incident procedures exist.                                                                                                        | Approved RTO/RPO, encrypted production backups, witnessed restoration/reconciliation, alternate staffing, communications drill, and executive acceptance remain.      |
| Dependencies/licensing/cost      | Lockfile, pinned package versions, Dependabot, notices, MIT license, and dependency policy exist.                                                                                   | Current advisory/license/SBOM results, container/base-image review, vendor budgets, unit economics, allocation, and anomaly alerts require network/platform evidence. |

## Technical debt and remaining gaps

The canonical TD-001–TD-010 register remains open. Highest engineering risks are
missing production providers (TD-005), browser/accessibility evidence (TD-002),
security automation (TD-007), load evidence (TD-003), and an API contract
(TD-009). Organizational ownership (TD-010) is a critical manual blocker. The
memory/PostgreSQL operation list is now executable, but return shapes,
transactions, concurrency, lifecycle behavior, and failure semantics still need
shared contract tests.

No byte-identical non-empty repository files, circular module imports, unused
dependencies, or dead code are claimed as conclusively absent: the structural
scan covers byte duplicates, documentation reachability, local references, and
merge markers, while semantic duplication, runtime reachability, dependency
usage, and cycles require dedicated analyzers and human review. Existing lint,
type, build, and test gates provide additional but incomplete evidence.

## External dependencies and manual approvals

1. GitHub connectivity and an authorized maintainer for PR threads, branch
   protection, secret scanning, checks, and merge approval.
2. Product owner decisions for users, jurisdictions, claims, minors, tenant
   model, and feature scope.
3. Qualified legal, privacy, regulatory, clinical, pharmacy, accessibility, and
   independent security review.
4. Approved hosting, database, KMS/secrets, email, storage, malware scanning,
   monitoring/SIEM, and support vendors with contracts and data terms.
5. Platform/SRE approval for topology, SLOs, on-call, capacity, recovery,
   release, rollback, and cost controls.
6. Hospital/partner approval and sandbox/profile evidence before any FHIR/SMART
   implementation; explicit regulatory approval before affected functionality.

## Recommended implementation priority

1. **Now:** enforce repeatable repository integrity checks in CI (this PR), then
   reconcile current GitHub PR discussions when connectivity is restored.
2. **Next:** extend the E4 store contract with shared behavioral, transaction,
   concurrency, lifecycle, and failure-semantics tests without changing applied
   migrations.
3. Complete E3 default-deny authorization and tenant/RLS coverage with
   adversarial synthetic-tenant tests.
4. Add the E5 versioned API schema and compatibility tests, then focused
   signup/login/privacy browser and accessibility tests.
5. Add security supply-chain gates and privacy-reviewed observability; select
   production providers only after human/vendor approval.
6. Produce staging, load, restore, alert, incident, accessibility, penetration,
   and rollback evidence before any production Go/No-Go.
7. Keep AI, multi-agent, hospital, payment, and live-data integrations disabled
   until their explicit prerequisites and human approvals are recorded.

## Significant-change rationale

The new audit command is intentionally dependency-free and read-only. It checks
all non-generated repository files for byte-identical duplicates and merge
markers, validates local Markdown targets, and requires every `docs/*.md` file
to be discoverable from the canonical documentation inventory. It does not
fetch external URLs, execute content, infer compliance, or mutate files. This
small baseline capability closes a demonstrated documentation-orphan gap while
avoiding architecture, runtime, schema, provider, or approval changes.
