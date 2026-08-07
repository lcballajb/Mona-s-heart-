# Engineering execution plan

**Baseline:** repository `main` at 2026-08-06. This is an implementation backlog, not a new governance framework or evidence of production approval. Accepted ADRs, risk/debt registers, agent gates, and the production Go/No-Go checklist remain authoritative.

## Repository-wide architecture analysis

| Area                | Implemented now                                                                                                              | Missing, conflict, or duplicate                                                                                                                                                                                                                | Dependency / blocker                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Infrastructure      | Split API/frontend/worker images, staging Compose, nginx, environment example, health probes, migration gate                 | No production IaC, secrets/KMS integration, network policy, autoscaling, WAF, or certificate monitoring. Compose selects prohibited mock providers, so it is a shape/test artifact. Startup configuration was parsed independently by modules. | Select deployment target and reviewed vendors.                    |
| Backend/API         | Node HTTP boundary, body limit, CORS, headers, rate limiting, cookie sessions/CSRF, account and terminology routes           | Hand-written dispatch has no OpenAPI contract, request schema layer, request IDs, graceful shutdown, or HTTP integration harness. Several service operations have no routes.                                                                   | Runtime configuration, identity hardening, persistence contract.  |
| Authentication      | Registration, verification, scrypt passwords, enumeration-resistant reset, lockout, opaque digest-only sessions              | No MFA, session-management API, production email adapter, credential-change notification, or federation. Session pepper is required but session digests do not use it.                                                                         | Email provider, E1, threat tests.                                 |
| Authorization       | Server owner/member/role checks, privileged approval trail, initial PostgreSQL RLS                                           | Incomplete route exposure and RLS coverage; no centralized capability matrix or organization-scope middleware; revocation behavior needs adversarial tests. UI roles are non-authoritative.                                                    | Authentication and transaction-scoped database identity.          |
| Database            | Versioned schema, migration/seed scripts, pool, PostgreSQL store, job tables, partial RLS, integration tests                 | Store parity is incomplete; KMS encryption, retention/deletion execution, full RLS, and coded expand/contract procedure are absent. Memory/PostgreSQL duplication is intentional but needs contract tests.                                     | Managed PostgreSQL/KMS and privacy decisions.                     |
| Frontend            | React/Vite responsive PWA, routes, terminology components, privacy defaults, high-risk flags off                             | Monolithic `main.tsx`, fictional/local state, no authenticated API client, browser E2E/component/a11y suite, or error-boundary strategy.                                                                                                       | Stable API contract and authentication.                           |
| Mobile              | Installable responsive PWA and privacy-safe offline fallback                                                                 | No native project, secure native storage, attestation, store metadata, or native accessibility evidence. Native mobile is an unapproved product decision, not a duplicate to build now.                                                        | Product/jurisdiction/store approval after web pilot.              |
| AI                  | Provider-neutral contracts, output schema, guardrails, registries, evaluation plan, disabled flags                           | No invocation, evidence service, review queue, runtime evaluation, usage ledger, or approved exact model.                                                                                                                                      | AI gate is blocked pending named reviews/vendor/model/evaluation. |
| Multi-agent runtime | Documented organization, registry, permissions, audit, cost, evaluation, memory, escalation and roadmap                      | No orchestrator, executable registry/policy engine, gateway, approvals, audit sink, evaluator, kill switch, or cost enforcement. Implementing before the roadmap prerequisites conflicts with the accepted gate.                               | Approved synthetic-only Phase A prerequisites.                    |
| Security            | Policies/threat model, HTTP controls, token hashing, dependency review, scanning/storage abstractions, fail-closed factories | No SAST/secret/container scan, penetration evidence, secrets manager, SIEM/WAF, immutable audit export, or operational key rotation.                                                                                                           | Platform/vendor choices and staffed operations.                   |
| Testing             | Unit/integration tests, PostgreSQL CI, type/lint/format/build, migration/seed and backup dry runs                            | No browser E2E/a11y, API/store contract, fuzz, mutation, load/soak, restore, or agent/AI harness. Coverage is not measured.                                                                                                                    | Add tests per epic; E2E follows stable UI/API seam.               |
| Monitoring          | Redaction helper, health/readiness, provider health, backup/restore scripts/runbooks                                         | No telemetry backend, SLOs, trace/metric pipeline, alert delivery, immutable security audit pipeline, or completed exercise.                                                                                                                   | Deployable platform and privacy-reviewed vendor.                  |
| GitHub Actions      | CI, PostgreSQL, dependency review and existing governance/maintenance workflows                                              | Actions use tags rather than SHAs; no CodeQL, secret/image/SBOM/provenance scan, deployment environments, canary, or rollback. Extend rather than duplicate existing workflows.                                                                | Permissions/environment review.                                   |
| Documentation       | ADRs, API/data/provider/runbooks, policy/governance inventories and readiness artifacts                                      | Implemented route/provider status can drift; API contract and generated deployment inventory are absent. Implementation docs must report evidence, not promote plans to complete.                                                              | Update canonical docs in each implementation PR.                  |

## Conflict and duplication decisions

1. Keep the accepted React/Vite + Node API + PostgreSQL topology. Do not introduce a framework rewrite, second API, alternative agent hierarchy, or client-side authorization layer.
2. Keep memory adapters only for deterministic development tests; production remains PostgreSQL/provider-backed and fail-closed. Enforce interface parity rather than mixing environment responsibilities.
3. Treat the PWA as the current mobile surface and defer native code until approved.
4. Treat AI and agents as gated capabilities. Build a synthetic Phase A sandbox only after documented approvals; implementation priority does not override safety gates.

## Ordered engineering epics

Estimates apply after external decisions: **S** = 1–3 engineer-days, **M** = 1–2 weeks, **L** = 3–6 weeks, **XL** = multi-team/quarter. Each epic is a PR series.

### E1 — Production runtime and infrastructure baseline (order 1, M)

- **Purpose/dependencies:** establish validated, typed, fail-closed process configuration and reproducible non-PHI staging, following ADR-002/004/005; later increments require platform/provider selection.
- **Files affected:** `server/config.mjs`, provider factories, Dockerfiles, Compose, `.env.example`, deployment/operations docs, CI.
- **Acceptance criteria:** invalid/placeholder production values stop before listening; no secrets logged; API/worker config contract-tested; migrations run once; probes and graceful shutdown work; fictional staging deploys to a reviewed target.
- **Risks/validation:** configuration drift, leakage and false confidence; test bounds/failure aggregation, scan images, rehearse migrations, inject readiness failures, smoke and roll back staging.
- **Current increment:** centralized API startup parsing and production placeholder/adapter checks. Deployment remains blocked because providers are unselected.

### E2 — Authentication hardening (order 2, M)

- **Purpose/dependencies:** complete account lifecycle without enumeration or credential exposure; depends on E1 and reviewed email.
- **Files affected:** security/service/API, stores/migrations, auth UI and docs/tests.
- **Acceptance criteria:** normalized schema-validated input, peppered sessions and rotation, complete verification/reset/change/revocation, MFA or recorded risk decision, secure cookies and notifications; no privileged self-registration.
- **Risks/validation:** takeover, enumeration, fixation, lockout DoS; use store-contract and HTTP adversarial/timing/replay/CSRF tests plus independent security review.

### E3 — Authorization and tenant isolation (order 3, L)

- **Purpose/dependencies:** consistently enforce approved capabilities, organization scope, consent and ownership; depends on E2 and E4 transaction identity.
- **Files affected:** service/security, PostgreSQL store/migrations, route middleware, access-control/API docs/tests.
- **Acceptance criteria:** code-mapped capability matrix, default deny, audited grants/revocations, complete sensitive-table RLS, cross-user/tenant denial.
- **Risks/validation:** IDOR, stale privileges, RLS mismatch; exhaustive role/resource matrix, synthetic tenant tests and penetration testing.

### E4 — Database durability, encryption and lifecycle (order 4, L)

- **Purpose/dependencies:** close adapter parity and safely encrypt, retain, export and delete data; depends on E1, privacy decisions, PostgreSQL/KMS/storage.
- **Files affected:** migrations, stores, document/jobs services, migration/backup scripts/runbooks.
- **Acceptance criteria:** memory/PostgreSQL store contract, envelope encryption metadata, idempotent lifecycle jobs, expand/contract migrations and verified RPO/RTO restore.
- **Risks/validation:** loss, key loss, incomplete deletion, downtime; integration/concurrency/failure tests, restore drill, migration rehearsal and integrity checks.

### E5 — Versioned API contract and service completion (order 5, M)

- **Purpose/dependencies:** expose approved operations through a stable validated API; depends on E2–E4.
- **Files affected:** router, schema/contract, services, API reference, frontend client/tests.
- **Acceptance criteria:** OpenAPI or approved equivalent for routes/errors, schema validation, request IDs, pagination/idempotency where needed and compatibility checks.
- **Risks/validation:** breaking changes, mass assignment, leakage; contract, malformed/fuzz, generated-client smoke and compatibility-diff tests.

### E6 — Governed AI runtime (order 6, XL; blocked)

- **Purpose/dependencies:** execute the existing evidence-grounded design with mandatory review, never autonomous diagnosis/prescribing; requires E1–E5 and model/vendor/privacy/security/clinical/legal/AI approvals.
- **Files affected:** `src/ai`, server-only adapters/services, registries, evaluation fixtures, usage/audit tables and AI docs.
- **Acceptance criteria:** allowlisted versions/sources, PHI boundary, grounded structured output, human review, clinical guardrails, kill switch/rollback/cost caps, off by default.
- **Risks/validation:** harm, hallucination, disclosure, injection, drift; synthetic red-team/evaluations, grounding tests, review/rollback drill and independent approvals.

### E7 — Multi-agent Phase A runtime (order 7, XL; blocked)

- **Purpose/dependencies:** implement the documented read-mostly operating system in a synthetic sandbox; requires E6 controls and every `AGENT_ROADMAP` prerequisite.
- **Files affected:** server orchestrator, executable registry/policy engine, flags, audit/cost tables, existing agent docs/tests.
- **Acceptance criteria:** registered roles only, least privilege, policy before action, no self-approval/spawn/merge/deploy/clinical act, human escalation, kill switches and immutable lineage.
- **Risks/validation:** confused deputy, escalation, loops/cost, context leaks; synthetic permission/delegation/loop/budget tests and kill-switch/rollback exercise.

### E8 — Governed memory and knowledge boundary (order 8, L; blocked with E7)

- **Purpose/dependencies:** implement existing memory policy with provenance, scope, retention and deletion; depends on E4/E7 and approved sources.
- **Files affected:** memory service/schema, registry integration, policy, audit/evaluation tests.
- **Acceptance criteria:** tenant/source/purpose isolation, retrieval provenance, no production learning, enforced TTL/deletion and approval for sensitive writes.
- **Risks/validation:** poisoning, stale evidence, disclosure, deletion gaps; poisoning/isolation/clock/deletion tests and provenance completeness.

### E9 — Tool gateway and approvals (order 9, L; blocked with E7)

- **Purpose/dependencies:** mediate every agent tool call through documented permissions and accountable humans; depends on E3 and E7–E8.
- **Files affected:** gateway/policy/approval services, tool registry, queue/UI, audit schema/docs/tests.
- **Acceptance criteria:** deny-by-default schemas, scoped credentials/egress, expiring non-self approvals, idempotency, redacted results and no direct production mutation.
- **Risks/validation:** injection, spoofing, credential exposure; allowlist/injection, replay/expiry/network-failure tests and approval exercise.

### E10 — Tamper-evident audit system (order 10, M)

- **Purpose/dependencies:** complete identity/data/admin/AI/agent accountability without PHI/content/secrets; depends on E3–E5 and extends through E6–E9.
- **Files affected:** stores/migrations, audit/observability service, archive adapter and logging docs/tests.
- **Acceptance criteria:** canonical schema, request/run/model/tool lineage, append-only restricted sink, integrity/retention checks and monitored delivery failures.
- **Risks/validation:** leakage, gaps, tampering, cardinality; event coverage, redaction corpus, integrity verification and sink outage/replay/access tests.

### E11 — Observability and reliability (order 11, M)

- **Purpose/dependencies:** operate against approved SLOs with privacy-safe signals; depends on E1/E5/E10 and vendor review.
- **Files affected:** observability/health, providers, dashboard/alert IaC and runbooks.
- **Acceptance criteria:** approved-only metrics/traces/logs, SLI dashboards, actionable alerts, dependency health and incident links; no raw health/user content.
- **Risks/validation:** silent failure, fatigue, disclosure; redaction/cardinality checks, probes, alert routing and game day.

### E12 — Quality gates and user-path testing (order 12, M)

- **Purpose/dependencies:** expose regressions across API/UI/accessibility/data/safety; begins in every epic and reaches E2E after E5.
- **Files affected:** tests/fixtures, scripts, CI and test matrix.
- **Acceptance criteria:** coverage ratchet, signup/login/privacy keyboard E2E, accessibility evidence, load thresholds, security/safety suites and flaky-test ownership.
- **Risks/validation:** brittle tests, PHI-like fixtures, misleading coverage; fictional seeds, repeatability, mutation sampling, manual accessibility and load reports.

### E13 — Controlled deployment and release (order 13, L)

- **Purpose/dependencies:** repeatable staged release with provenance, canary and rollback; depends on E1–E5/E10–E12 while E6–E9 remain separately gated/off.
- **Files affected:** IaC, Docker/release workflows, SBOM/provenance, flags, release/rollback docs and scorecard.
- **Acceptance criteria:** immutable scanned artifacts, protected environments, compatible migrations, smoke/canary, tested rollback, flags off and linked Go/No-Go evidence.
- **Risks/validation:** supply chain, irreversible schema, drift; ephemeral deployment, signature verification, canary failure and rollback drill.

## Critical path and next increment

`E1 configuration → E2 identity → E4 database contract/lifecycle → E3 authorization/RLS → E5 API contract → E10 audit → E11 observability → E12 evidence → E13 deployment`.

E2 input/session hardening is now implemented and recorded in [`MILESTONE_E2_AUTHENTICATION.md`](MILESTONE_E2_AUTHENTICATION.md). MFA selection, production email delivery and independent review remain explicit human/vendor dependencies rather than controls that can be self-approved in this repository.

The next safe increment is E4 store-contract and lifecycle work, followed by E3 tenant isolation. AI and agents must wait for existing gates; infrastructure, identity, database, authorization, audit and testing can proceed without weakening governance.
