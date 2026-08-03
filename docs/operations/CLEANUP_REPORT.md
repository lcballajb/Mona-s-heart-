# Cleanup report

## Executive summary and repository health

This cleanup aligns Node documentation with the existing Node 24 LTS toolchain,
removes a contradictory “no backend” README claim, strengthens CI checkout and
dependency-review permissions, and records repository, dependency, environment,
test, workflow, security, privacy, and medical-safety audits. It introduces no
product capability. Health is **conditionally assessed**: formatting and the targeted medical-safety
suite pass, while clean dependency installation, full build, PostgreSQL, and
network advisory verification have explicit external prerequisites.

## Changes and retained files

No file was deleted: searches found no alternate lockfile, generated output,
logs, databases, backup copies, or confidently dead tracked module. `.gitkeep`,
database migrations, development adapters/fictional data, architecture plans,
and defense-in-depth tests were retained because repository layout, migration
history, local tests, or documented future boundaries rely on them. `.gitignore`
already excludes dependencies, builds, environment files except the safe
example, logs, OS files, coverage, and TypeScript build metadata.

CI now checks that generation and verification commands leave no diff and grants
the dependency-review job only the additional pull-request read permission it
needs. PostgreSQL 16 is mandatory in CI; migrations and the fictional idempotent
seed run before tests. GitHub secret scanning/push protection remains a repository
setting and is recommended rather than replaced with an unpinned third-party
workflow.

## Dependencies and Dependabot

No dependency was changed without registry/release-note access. Package-manager,
classification, toolchain, vulnerability, and open-PR limitations and decisions
are in `DEPENDENCY_UPDATE_PLAN.md`. No Dependabot PR was merged or closed. Major
framework/tool migrations remain separate. A maintainer must perform the recorded
network-enabled review before merge.

## Regression, security, privacy, and medical safety

The complete current inventory and intentional local PostgreSQL skip are in
`docs/testing/TEST_MATRIX.md`. Existing tests cover store contracts, nulls,
isolation, export privacy, production TLS/fail-closed adapters, enumeration
resistance, bounded controls, trusted proxies, terminology fallback/provenance,
redacted observability, core accessibility semantics, medical refusals, and
emergency escalation. Missing browser user-event and request-level scenarios are
honestly recorded rather than claimed complete.

No tracked secret, obvious real-patient fixture, or tracked output was found.
Actual controls and remaining independent security/privacy/clinical review gaps
are documented in `REPOSITORY_HEALTH_AUDIT.md`; no compliance claim is made.

## Documentation and environment corrections

README and PostgreSQL setup now name Node 24 LTS and accurately distinguish the
checked-in API from a deployed/approved clinical system. The complete variable
inventory identifies scope, defaults, production requirements, secret/flag
status, and fail behavior. Branch protection and the eight-step contribution
workflow are documented separately.

## Known limitations and independent review

- Rerun `npm audit --json` with registry access and review every finding.
- Enumerate every open Dependabot PR with GitHub access and record its disposition.
- Run PostgreSQL checks against a disposable PostgreSQL 16 database.
- Independently review browser state behavior, HTTP routing/session/CSRF behavior,
  branch rules, GitHub secret scanning, dependency graph, action versions,
  accessibility, security/privacy, and all medical content.
- Real providers, live data, EHR/FHIR, advanced AI, video, and mobile work are
  outside this cleanup and remain disabled/deferred.
