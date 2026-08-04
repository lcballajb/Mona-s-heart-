# CI/CD and build pipeline

## Verified continuous integration

Pull requests run a PostgreSQL 16 test service, `npm ci`, migrations, idempotent fictional seed, typecheck, lint, format check, unit tests, PostgreSQL integration tests, Vite build, backup/restore dry runs and clean-tree checks. Dependency Review runs with read-only repository and pull-request permissions and fails moderate-or-higher newly introduced advisories.

Dependabot opens bounded weekly npm and GitHub Actions PRs. Scheduled governance workflows create issues and artifacts only. No workflow in this repository auto-merges, auto-publishes policy/medical content, deploys production or has `write-all` permissions.

## Unverified external controls

Repository inspection cannot verify required status checks, branch protection/rulesets, environment reviewers, runner hardening, Actions allowlists, secret scanning/push protection, Dependabot alerts, CodeQL/Advanced Security, artifact retention, OIDC trust, deployment logs or current workflow success. A repository administrator must capture dated settings/run evidence.

## Deployment boundary

There is no production deployment workflow. This is intentional until production architecture, vendors, secrets, approvals, smoke tests, observability and rollback are accepted. A future deployment uses immutable artifacts, environment-scoped OIDC/least privilege, provenance/SBOM, protected reviewers, canary gates and explicit rollback; it must not reuse pull-request secrets or silently fall back to mocks.
