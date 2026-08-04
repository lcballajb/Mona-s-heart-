# CI/CD and build pipeline

## Verified continuous integration

Pull requests run a PostgreSQL 16 test service, `npm ci`, migrations, idempotent fictional seed, typecheck, lint, format check, unit tests, PostgreSQL integration tests, Vite build, backup/restore dry runs and clean-tree checks. Dependency Review runs with read-only repository and pull-request permissions and fails moderate-or-higher newly introduced advisories.

Dependabot opens bounded weekly npm and GitHub Actions PRs. Scheduled governance workflows create issues and artifacts only. No workflow in this repository auto-merges, auto-publishes policy/medical content, deploys production or has `write-all` permissions.

## Unverified external controls

Repository inspection cannot verify required status checks, branch protection/rulesets, environment reviewers, runner hardening, Actions allowlists, secret scanning/push protection, Dependabot alerts, CodeQL/Advanced Security, artifact retention, OIDC trust, deployment logs or current workflow success. A repository administrator must capture dated settings/run evidence.

## Deployment boundary

There is no production deployment workflow. This is intentional until production architecture, vendors, secrets, approvals, smoke tests, observability and rollback are accepted. A future deployment uses immutable artifacts, environment-scoped OIDC/least privilege, provenance/SBOM, protected reviewers, canary gates and explicit rollback; it must not reuse pull-request secrets or silently fall back to mocks.

## Workflow control matrix

| Workflow                   | Purpose/cadence                                     | Permissions                                                               | Concurrency/timeout                                                                     | Error handling and evidence                                                                                                                     |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                   | Pull requests and pushes to `main`; build/test only | Workflow `contents: read`; dependency job adds only `pull-requests: read` | Per-PR/ref group cancels obsolete runs; verify 30 minutes, dependency review 10 minutes | Any command failure fails the job; final clean-tree check detects generated drift; PostgreSQL health check bounds service startup               |
| `governance-watch.yml`     | Weekly/monthly/quarterly/annual human reminders     | `contents: read`, `issues: write`                                         | One non-cancelling workflow group; 10 minutes                                           | Idempotent title check prevents duplicate open issues; label is read-or-created; GitHub API errors fail visibly; issue records run/date/cadence |
| `security-maintenance.yml` | Daily triage; weekly audit/SBOM/repository review   | `contents: read`, `issues: write`                                         | One non-cancelling workflow group; daily 10 minutes, inventory 20 minutes               | Audit failure fails inventory; `if: always()` still creates the evidence/review issue and tells reviewers when the artifact is absent           |
| `standards-watch.yml`      | Monthly source and quarterly strategy reminders     | `contents: read`, `issues: write`                                         | One non-cancelling workflow group; 10 minutes                                           | Idempotent issue creation; API errors fail visibly; source/cadence recorded for human verification                                              |

Scheduled times are deliberately staggered; daily and weekly security jobs use separate conditions. None checks out untrusted pull-request code with write credentials, uses `pull_request_target`, grants wildcard permissions, merges, publishes content, or deploys. Action version updates remain Dependabot-reviewed. Repository files cannot verify Actions settings, runner hardening, branch rules, execution success, billing, or organization policy; an administrator must capture that external evidence.
