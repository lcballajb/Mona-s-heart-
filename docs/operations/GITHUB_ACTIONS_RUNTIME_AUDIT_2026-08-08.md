# GitHub Actions runtime audit — 2026-08-08

## Scope and result

Every YAML file in `.github/workflows/` was inspected, including every `uses:`
reference, trigger, job permission, runner, timeout, service, condition, and
artifact setting. The required repository changes are
`actions/dependency-review-action@v4` to `@v5` and
`actions/upload-artifact@v4` to `@v5`. Both v5 releases move the actions from
their Node.js 20 runtimes to Node.js 24 without weakening dependency enforcement
or changing the artifact name, path, or 30-day retention policy.

The audit used the maintainers' release notes, migration documentation, action
metadata, and security guidance as the review baseline:

- [GitHub Actions: New major versions of upload-artifact and download-artifact](https://github.blog/changelog/2025-12-04-new-major-versions-of-upload-artifact-and-download-artifact/)
- [upload-artifact releases](https://github.com/actions/upload-artifact/releases)
- [checkout releases](https://github.com/actions/checkout/releases)
- [setup-node releases](https://github.com/actions/setup-node/releases)
- [github-script releases](https://github.com/actions/github-script/releases)
- [dependency-review-action releases](https://github.com/actions/dependency-review-action/releases)
- [Actions runner releases](https://github.com/actions/runner/releases)

Live retrieval of those pages was blocked in this execution environment. The
upgrade is limited to the already-documented v5 runtime migration; release
currency must be reconfirmed when the pull request is reviewed on GitHub.

## Action inventory and disposition

| Action                             | Occurrences | Old  | New/disposition | Runtime           | Breaking-change and security review                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ----------: | ---- | --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `actions/upload-artifact`          |           1 | `v4` | `v5`            | Node 20 → Node 24 | v5's relevant breaking change is the runtime/runner floor. Existing `name`, `path`, and `retention-days` inputs remain valid; no download step or output consumer exists. Hidden files are irrelevant because the single explicit path is `sbom.cdx.json`. Permissions, artifact visibility, overwrite behavior, and retention remain unchanged. |
| `actions/checkout`                 |           3 | `v5` | Leave at `v5`   | Node 24           | Already on the Node 24 major. v6 changes credential storage and therefore is not a blind runtime-only upgrade. No workflow pushes, checks out a fork-selected ref, or uses `pull_request_target`; the defaults preserve present checkout behavior.                                                                                               |
| `actions/setup-node`               |           2 | `v5` | Leave at `v5`   | Node 24           | Already on the Node 24 major. `node-version: 24` and npm caching remain unchanged; no token or registry publication is configured.                                                                                                                                                                                                               |
| `actions/github-script`            |           4 | `v8` | Leave at `v8`   | Node 24           | Current Node 24 major. Scripts only read/create issues and labels. The scheduled workflows retain explicit `contents: read` and `issues: write`; no broader permission is added.                                                                                                                                                                 |
| `actions/dependency-review-action` |           1 | `v4` | `v5`            | Node 20 → Node 24 | The v5 runtime migration requires the newer runner but does not change the configured enforcement input. `fail-on-severity: moderate`, `contents: read`, `pull-requests: read`, PR-only execution, and the required job name are unchanged. No vulnerability, license, OpenSSF, allow/deny, or retry input was present to migrate or weaken.     |

No upload consumer uses `actions/download-artifact`, and no cache action, CodeQL
action, third-party action, deployment action, or other dependency/security
scanner is referenced. CodeQL is therefore not silently added: doing so would
change required security behavior and may require organization settings and
permissions outside this focused runtime migration. The weekly `npm audit` and
pinned CycloneDX command are shell steps, not JavaScript actions, and are left
unchanged.

## Runner and application compatibility

The Node 24 action majors require Actions Runner **v2.327.1 or later**. All jobs
use `ubuntu-latest`, so GitHub-hosted runners satisfy and maintain that floor.
No self-hosted runner label exists. A future move to self-hosted runners must
enforce the same minimum before these actions can start.

An action's bundled JavaScript runtime is separate from the application's Node
runtime. The application independently requires Node 24 through
`package.json`'s `>=24 <25` engine constraint, `.nvmrc`, the setup-node inputs,
and its container configuration. This audit does not change any application
runtime pin.

## Workflow behavior and least privilege

- CI triggers, the PostgreSQL service, required job names, commands, concurrency,
  timeouts, and `contents: read` default remain unchanged.
- Dependency review remains PR-only and continues to fail at `moderate` severity;
  its job retains only `contents: read` and `pull-requests: read`.
- Scheduled issue workflows retain only `contents: read` and `issues: write`,
  which is required to create their human-review issues and labels.
- Artifact production still runs only in the scheduled/manual inventory job.
  The change does not deploy, merge dependencies, persist a new credential,
  introduce `pull_request_target`, or check out an untrusted fork ref.
- The repeated database seed in CI is intentional idempotency verification, not
  duplicate obsolete workflow logic. The four scheduled issue scripts serve
  different cadences or evidence scopes and are not interchangeable duplicates.

## Validation record and external limitations

Local validation covers formatting, lint/type checking, repository structure,
unit tests, production build, whitespace, and parsing every workflow as YAML.
The pull request should additionally confirm the `CI` and scheduled workflow
checks on GitHub-hosted runners. This environment has no authenticated GitHub
session or network route to GitHub, so it cannot inspect current action tags,
branch-protection required checks, Actions run results, or open pull-request
review comments. No review conversation was marked resolved. An authenticated
maintainer must review all open workflow/runtime/dependency-related comments and
resolve each only after its requested fix is present and the hosted checks pass.
