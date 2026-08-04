# Master repository hardening and maturity audit

**Audit date:** 2026-08-04  
**Commit assessed:** `4466378` plus the corrections in this branch  
**Scope:** all 250 tracked files present at audit start; 8,123 lines across `src/`, `server/`, `tests/`, `scripts/`, and `db/`  
**Decision:** **No-Go for production or real health data.** Suitable only for fictional-data development and control design.

## Evidence labels

- **Verified:** directly observed in tracked code, configuration, tests, or documentation and cited below.
- **Assumed:** plausible but not observable in this repository; not counted as implemented.
- **Requires Human Review:** needs qualified judgment, external configuration, contracts, deployed-system evidence, or independent testing.
- **Future Recommendation:** not needed to preserve the current prototype and must use normal change control if pursued.

## Executive scores

Scores measure repository evidence, not legal compliance, operational effectiveness, clinical validity, or production approval. Each domain uses the rubric below; an unverified external control receives no implementation credit. “Technical debt” is inverted: 100 means low debt.

| Domain                | Score / 100 | Evidence-based explanation                                                                                                                                                                                                                                                           |
| --------------------- | ----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository maturity   |          58 | Versioned architecture, migrations, CI, runbooks, and tests exist; production adapters, deployment evidence, support operations, and independent reviews do not.                                                                                                                     |
| Security              |          62 | Secure defaults, hashed credentials, CSRF, authorization, append-only audit schema, rate limits, headers, dependency review, and threat documents exist; SAST, secret scanning settings, container scanning, penetration results, production IAM, and alert evidence are unverified. |
| Production readiness  |          34 | PostgreSQL and provider boundaries exist, but vendor implementations, production topology, real restore evidence, E2E/load tests, on-call, and Go/No-Go approvals are missing.                                                                                                       |
| Governance            |          57 | Registers, RACI, cadence, policy control, and change/release procedures exist; named people, completed reviews, evidence links, risk acceptances, and governance meeting records are missing.                                                                                        |
| AI governance         |          64 | AI is disabled, the allowlist is empty, output types/guardrails/prompt and model registers exist; no configured provider, approved model, runtime integration, audit trail, evaluation result, cost budget, or clinical approval exists.                                             |
| Accessibility         |          42 | Semantic UI intentions, checklist, known limitations, and test matrix exist; no automated accessibility suite, browser/assistive-technology evidence, Lighthouse audit, or independent WCAG evaluation exists.                                                                       |
| Technical debt health |          52 | The codebase is small, typed, formatted, and adapter-oriented; frontend concentration in `src/main.tsx`, missing E2E/performance coverage, stale runtime/dependency migration work, and numerous unstaffed production integrations increase debt.                                    |

### Scoring rubric and reproducibility

Each domain was scored across five equally weighted controls: **documented (20), implemented (20), automatically tested (20), operationally evidenced (20), independently reviewed (20)**. Partial evidence receives 5–15 points. Scores are architectural triage, not statistical measurements. The detailed evidence and missing gates are in the [gap analysis](COMPREHENSIVE_GAP_ANALYSIS.md), [risk register](RISK_REGISTER.md), and [scorecard](PRODUCTION_READINESS_SCORECARD.md). A future reviewer must record score changes, evidence links, date, scope, and rationale.

## Verified architecture and controls

| Area              | Verified repository evidence                                                                                                                                                                | Status                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Frontend          | React/Vite/TypeScript PWA, high-risk flags default off, same-origin terminology boundary, service worker avoids authenticated/health data caching                                           | Verified repository design; browser behavior still needs E2E/accessibility testing                                                 |
| API               | Node HTTP API exposes health, terminology, registration, verification, login, logout, and explicit request controls; production HTTPS/proxy checks and security headers exist               | Verified in source; not a complete public API or deployed service                                                                  |
| Data              | Three PostgreSQL migrations define normalized identity, organization, health, consent, audit, document, job, and feature-flag records; PostgreSQL adapter uses transactions and RLS context | Verified schema/code; production tenancy, performance, migration, backup and restore are not independently validated               |
| Identity/security | Password hashing, expiring/revocable sessions, digest-only tokens, CSRF, role approval, access checks, throttling, append-only audit trigger, and fail-closed production adapters           | Verified in code/tests; no SSO/MFA, cloud IAM, key custody, independent penetration test, or deployed evidence                     |
| Services          | Provider-neutral email, storage, malware, shared-cache, worker, observability, backup, and restore boundaries                                                                               | Verified abstractions and dry-run paths; actual vendors and production behavior are absent                                         |
| AI/clinical       | AI provider contract, grounded output, medical guardrails, registries, human-review policy; terminology provenance and reviewed-association gates                                           | Verified scaffolding; no model or clinical content is approved, and AI runtime use is not integrated                               |
| CI/supply chain   | CI runs PostgreSQL service, migration/seed idempotency, type/lint/format/tests/build/restore dry runs and dependency review; Dependabot covers npm/Actions                                  | Verified workflow files; repository settings, run history, alerts, signing, Scorecard, SAST and secret scanning are not observable |
| Operations        | Staging compose, health/readiness, observability, backup/DR/incident/business-continuity/release documentation                                                                              | Verified plans; no production environment, SLO, on-call roster, exercise result, or recovery evidence                              |

## OWASP, CWE, and supply-chain review

This is a mapping review, not ASVS verification. Official references are starting points: [OWASP Top 10](https://owasp.org/Top10/), [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [CWE](https://cwe.mitre.org/), [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), and [OpenSSF Scorecard](https://scorecard.dev/).

| Risk family                      | Evidence found                                                                            | Remaining gap                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Broken access control / CWE-862  | Service-layer ownership/role checks, organization scoping, RLS context and negative tests | Route coverage matrix, IDOR fuzzing, multi-tenant penetration testing, administrator recovery          |
| Cryptographic failures / CWE-327 | Password/token digests, TLS production checks, object-key encryption boundary             | KMS configuration, cryptoperiod, certificate inventory, database/storage encryption evidence           |
| Injection / CWE-89, CWE-79       | Parameterized PostgreSQL, React escaping, fixed job/email kinds                           | DAST, content-security-policy validation, upload parser testing, dependency CVE triage                 |
| Insecure design                  | Threat model, disabled high-risk flags, production adapters fail closed                   | ASVS requirements traceability, abuse cases for community/video/minors, independent design review      |
| Security misconfiguration        | Explicit proxy/CORS/header/database settings                                              | Cloud/IAM/WAF/runners/branch protection/secret scanning settings unverified                            |
| Vulnerable components            | Lockfile, Dependabot, dependency review, scheduled audit/SBOM                             | Current online advisory/license result unavailable; no container/base-image scan or Scorecard workflow |
| Authentication failures          | Password policy, enumeration-resistant reset, session expiry/revocation, throttling       | MFA/passkeys, breached-password control, recovery operations, federation review                        |
| Integrity failures               | Lockfile, reviewed Actions majors, dependency review                                      | Artifact signing/provenance, pinned Action SHAs, deployment attestations                               |
| Logging/monitoring failures      | Audit schema, redaction utilities, liveness/readiness                                     | SIEM/error provider, alert thresholds, retention, on-call and incident exercise evidence               |
| SSRF / external services         | Fixed/default upstreams and server-side provider boundaries                               | URL allowlist and egress controls for every future vendor; adversarial integration tests               |

## Quality and developer-experience assessment

- **Verified:** unit and integration-style Node tests, PostgreSQL integration suite, TypeScript project builds, ESLint, Prettier, npm lockfile, Husky/lint-staged, fictional seed, local and staging commands.
- **Requires Human Review:** CI run history, branch protections, CodeQL/Advanced Security availability, dependency/license findings, browser matrix, accessibility audit, performance budget, production smoke test, load/capacity test, chaos/restore exercise.
- **Missing:** browser E2E runner, component tests, automated accessibility tests, Lighthouse CI, API contract test, load benchmark, coverage reporting, container scan, artifact provenance.
- **Future Recommendation:** add these one at a time with an ADR or focused PR; do not replace the current test stack merely to standardize tooling.

## AI governance assessment

- **Verified:** `AI_ENABLED=false`, exact model allowlist is empty, no browser-secret convention, grounded-output contract, human-review requirement, safety and incident documents, prompt/model registries.
- **Important limitation:** `isAIConfigured` is a library guard and no runtime provider invocation was found. The source-structure regression test is defense-in-depth, not proof that a future call path uses the guard.
- **Requires Human Review:** provider contract/data terms, exact model/version, retention/training/region, clinical purpose, evaluation thresholds, bias/grounding/injection tests, audit schema, cost ceiling/alerts, rollback rehearsal.
- **Future Recommendation:** before integration, create one server-side gateway that enforces model registry, feature flag, purpose, budget, health-data eligibility, audit metadata, timeout and kill switch. Never add a browser provider SDK or silent model substitution.

## Operational monitoring assessment

The observability module, redaction rules, health/readiness endpoints and error-monitoring placeholder are verified. A Sentry-compatible DSN is documented but no provider implementation is configured. Database pool/readiness, worker queue and restore dry-run paths exist. Missing operational evidence includes dashboards, SLOs, synthetic checks, API latency/error alerts, database saturation/replication alerts, certificate/domain checks, backup job results, restored-data validation, staffed escalation, post-incident reviews and business-continuity exercises.

## Everything reviewed

| Repository surface | Review performed                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Root/config        | README, roadmap, changelog, license/notices, contribution/security guidance, ignore/hooks/lint/TypeScript/npm/env/PWA files             |
| GitHub             | CODEOWNERS, issue/PR templates, Dependabot, CI and all scheduled workflows; external settings and run history unavailable               |
| Frontend           | All tracked `src/` files, routes/content, flags, matching/privacy, terminology, AI contracts/guardrails, service worker/manifest/styles |
| Backend/API        | All tracked `server/` files: request handling, security, service/store/PostgreSQL, providers, workers, health and observability         |
| Data               | All migrations, fictional seed, migration/backup/restore scripts and database documentation                                             |
| Infrastructure     | All Dockerfiles, staging Compose and nginx configuration; no production IaC exists                                                      |
| Tests              | Every tracked test and the test matrix; test inventory and skipped integration conditions reviewed                                      |
| Documentation      | Every tracked Markdown filename and heading inventory; overlapping topics mapped in `docs/README.md`                                    |
| Mobile             | No React Native/native project found; only PWA artifacts were assessed                                                                  |

## Intentionally unchanged

| Item                                | Reason                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Application UI and feature behavior | Audit found no justified functional change; preserve the fictional-data prototype and avoid unrequested rewrite/regression        |
| Node HTTP architecture              | Existing dependency-light API and adapter boundaries are coherent; framework migration would add risk without evidence            |
| PostgreSQL schema/migrations        | No verified defect justified rewriting applied history; future schema changes must be forward migrations                          |
| React/Vite dependency versions      | Existing Vite migration evaluation defers breaking upgrades; no upgrade should be merged without install/build/migration evidence |
| Development mocks                   | They are explicitly non-production and production factories fail closed; removing them would harm safe local testing              |
| Mobile/React Native                 | No native code exists and current product direction is PWA; native work is a future product decision                              |
| AI provider integration             | No provider/model has approval, contract, evaluation or clinical purpose; adding one would violate governance gates               |
| Hospital/FHIR implementation        | Architecture only is appropriate until a partner, profile/version and hospital IT review exist                                    |
| Legal/clinical conclusions          | Applicability, approval, validation and compliance cannot be established from repository inspection                               |

## Remaining human decisions

1. Product owner: intended users, launch states/countries, age floor, organization model, clinical claims, community/video scope, and beta risk acceptance.
2. Qualified Legal/Privacy/Regulatory: law applicability, controller/processor/covered-entity roles, notices/consents, retention, transfers, contracts, FDA/device and telehealth boundaries.
3. Security/Operations: production topology, vendors, IAM/KMS/secrets, GitHub settings, SLO/on-call, vulnerability exceptions, penetration scope, recovery objectives.
4. Clinical/Pharmacy/Integrative Health: reviewer credentials, evidence thresholds, approved sources/content, expiration and adverse-event pathways.
5. Accessibility: supported browser/assistive-technology matrix, target standard/scope, research participants and independent evaluation.
6. Hospital IT/Interop: FHIR/SMART versions and profiles, EHR sandbox, identity, audit, data-sharing and procurement requirements.
7. Executive/finance: support staffing, insurance, vendor budget, sustainability and service-shutdown obligations.

## Maintainer conclusion

Keep the repository in fictional-data prototype status. The highest-value next step is not new feature code: it is to assign accountable humans, validate the external settings and vendor boundaries that source control cannot prove, close critical risks R-001 through R-010, and produce repeatable test/exercise evidence. Re-score only after evidence is linked; do not interpret the scores as compliance or approval.
