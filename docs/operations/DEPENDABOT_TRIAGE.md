# Dependabot triage report

Reviewed: 2026-08-04  
Base: `main` at `0c0f6e3`  
Scope: remaining open Dependabot pull requests known to this repository snapshot

## Inventory method and limitations

The repository snapshot identifies Dependabot PR #14 as the remaining grouped
update. The workspace could not refresh `origin/main`, enumerate GitHub pull
requests, retrieve PR checks, query npm, or authenticate advisory metadata:
outbound GitHub and registry requests return HTTP 403 and no GitHub CLI or
credentials are installed. Accordingly, this report does not claim a live
GitHub inventory or a passing result for PR #14. A maintainer must compare the
open-PR list with this report before acting. No dependency PR was merged.

The local base is the repository's latest supplied `main` snapshot, including
the dedicated Vite 8 evaluation merged as #16. Package classifications use the
checked-in manifest and lockfile. "CI unknown" below means that GitHub check
runs could not be read; it does not mean CI failed or passed.

## Per-PR assessment

| PR  | Package and versions                                                                                                 | Update                                                                        | Dependency class                                                                                                                                                           | Security relevance                                                                                                                                                                                                                                                                                                                                             | Compatibility and breaking-change risk                                                                                                                                                                                                                                                                                                                                                            | CI                                                                                                                                      | Recommendation                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #14 | `vite` `6.0.5` → `8.2.0`; the grouped lockfile update also appears to include `brace-expansion` advisory remediation | **Major** for Vite; transitive patch/remediation intent for `brace-expansion` | Vite is a direct build/development tool currently declared in `dependencies`; `brace-expansion` is a development-only transitive dependency through `eslint` → `minimatch` | The grouped PR appears security-motivated for a `brace-expansion` regular-expression denial-of-service advisory. The current `main` lockfile already resolves `brace-expansion@5.0.5`, so the known advisory component is superseded locally and is not in production images. Advisory identity and fixed range still require authenticated dependency review. | **High.** Vite crosses two majors. Node 24 support for the proposed release was not authenticated. `@vitejs/plugin-react@4.3.4` has only been established as compatible through Vite 6, so the proposed pair is not approved. React 18.3.1 and TypeScript 5.7.2 must remain unchanged and be explicitly exercised against a compatible Vite/plugin pair. React Router is not directly implicated. | **Unknown**: GitHub checks are inaccessible. Local checks on this report branch do not validate PR #14 because its diff is not present. | **Close the grouped PR as superseded/mixed-risk.** Do not merge it. If Vite 8 is still wanted, create a dedicated migration PR that updates only Vite and a compatible official React plugin, authenticates release metadata, and completes the migration/browser/container test plan. Independently confirm the `brace-expansion` advisory is resolved on `main`. |

## 1. Safe to merge now

None. No open Dependabot change is both available for inspection and established
as compatible, low risk, and green in CI. Therefore this triage creates no
combined dependency-update branch or PR.

## 2. Needs a dedicated migration PR

- **Vite portion of #14:** Vite 6.0.5 → 8.2.0 is a major build-system migration,
  not a routine dependency refresh. Keep it isolated from security remediation
  and unrelated upgrades. Follow `VITE_8_EVALUATION.md`; authenticate the Vite
  7 and 8 migration guides and package engines, select an official React plugin
  with an explicit Vite 8 peer range, preserve React 18 and TypeScript 5.7,
  compare built output, and test Node 24, browser/PWA behavior, Nginx, and the
  frontend container. This is **deferred pending that dedicated migration**, not
  approved by this report.

## 3. Security update requiring priority review

- **`brace-expansion` portion of #14:** security ownership should promptly
  confirm the advisory identifier, affected and fixed ranges, and GitHub
  dependency-review result. The current lockfile resolves only
  `brace-expansion@5.0.5` through the development-only ESLint tree, so no further
  version change is indicated by the available repository evidence. If an
  authenticated scan says 5.0.5 is affected, open a minimal security-only PR;
  do not carry Vite 8 in it.

## 4. Duplicate or superseded

- **PR #14 as a grouped change:** close rather than merge. Its known transitive
  security remediation is already represented by `brace-expansion@5.0.5` on
  `main`, while its remaining Vite change belongs in a dedicated migration.
  Closing the mixed PR avoids reintroducing unnecessary lockfile churn or using
  an advisory as justification for an unrelated major upgrade.

## 5. Defer with documented reason

- **Vite 8 migration derived from #14:** defer until official metadata and
  migration documentation can be accessed and all migration gates above pass.
  The explicit blockers are unauthenticated Node 24 support, an incompatible or
  unverified React-plugin pairing, two intervening Vite major changes, and no
  available PR-specific CI evidence.

## Maintainer actions before closing or replacing #14

1. Refresh the GitHub open-PR list and add any Dependabot PR absent from this
   constrained snapshot to this report before merge.
2. Open #14's dependency-review and CI checks. Record their conclusions; do not
   infer green status from this report branch.
3. Confirm the advisory and current `brace-expansion@5.0.5` resolution with
   GitHub dependency review or `npm audit` in a network-enabled environment.
4. Close #14 only after preserving any useful advisory reference in the issue
   or replacement PR. Do not merge it automatically.
5. If proceeding with Vite 8, use one dedicated migration branch and PR. Do not
   include major React, React Router, TypeScript, or plugin upgrades except as
   separately scoped migrations.
