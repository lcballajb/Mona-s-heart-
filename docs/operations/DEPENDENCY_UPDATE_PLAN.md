# Dependency update plan

## Audit scope and result

The repository uses npm only. `package.json` and `package-lock.json` are the sole
package manifests, all non-built-in imports are declared, and no duplicate
package-manager lockfile was found. Runtime dependencies are React, React DOM,
React Router, Lucide, PostgreSQL (`pg`), Vite, its React plugin, and TypeScript;
ESLint, Prettier, and React type declarations are development-only. Vite,
TypeScript, and the React plugin are build-time dependencies despite their
current placement in `dependencies`; moving them would not change an npm
production install because the frontend image builds before copying static
output, so that low-value manifest churn is deferred.

Node 24 LTS is consistently selected by `engines`, `.nvmrc`, Docker images, CI,
and developer documentation. The lockfile is version 3 and `npm ci` is the
reproducibility gate.

## Dependabot review

Open GitHub pull requests could not be enumerated in this workspace: the
repository has no configured Git remote and outbound GitHub access returns HTTP 403. Therefore no Dependabot PR was merged, closed, or represented as reviewed.
A maintainer must compare this branch with every open npm and GitHub Actions PR
before merge and record the PR number and disposition here or in the PR review.

For each React/types, React Router, Vite/plugin, TypeScript, ESLint, Prettier,
`pg`, checkout, setup-node, dependency-review, or grouped update, record:

| Update                              | Semver | Direct/transitive | Runtime/dev/action | Vulnerability | Node 24 compatibility | Breaking/behavior impact               | Decision                   |
| ----------------------------------- | ------ | ----------------- | ------------------ | ------------- | --------------------- | -------------------------------------- | -------------------------- |
| _Populate from open Dependabot PRs_ | —      | —                 | —                  | —             | —                     | React/routing/build/test/CI/production | Pending independent review |

Patch/minor updates may be applied after release-note, Node 24, peer-dependency,
and clean-verification review. Major React, router, Vite, TypeScript, ESLint, or
PostgreSQL-driver migrations stay in separate PRs when behavior or configuration
changes. Never use `npm audit fix --force` as a substitute for that review.

## Vulnerability review

`npm audit --json` was attempted on 2026-08-03, but the registry audit endpoint
returned HTTP 403. That is an environment limitation, not evidence of zero
vulnerabilities. GitHub dependency review remains a required PR check; a
network-enabled maintainer must rerun `npm audit --json` after `npm ci` and
record package, advisory, severity, dependency/exposure class, reachability,
fix, migration risk, mitigation, and decision for every finding. Production
reachability must be assessed separately from development-tool exposure.
