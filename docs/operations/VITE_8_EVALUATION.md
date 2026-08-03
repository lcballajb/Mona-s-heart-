# Vite 8.2 migration evaluation

Reviewed 2026-08-03 against the repository state after the cleanup merge.

## Decision

**Vite remains pinned to 6.0.5.** Dependabot PR #14 must not be merged as a
grouped update. This environment cannot retrieve either the Vite 7 and Vite 8
migration guides or the npm metadata/tarball for `vite@8.2.0`: outbound access
to `vite.dev`, GitHub, and the npm registry returns HTTP 403. Consequently the
proposed version, its Node engine, its dependency graph, and a compatible React
plugin cannot be authenticated or installed. A major build-tool migration is
not safe on unverified release information.

The authoritative review inputs for a later attempt are the
[Vite migration guide](https://vite.dev/guide/migration), the migration guides
linked from it for both intervening majors, and the published package metadata
for Vite and its official React plugin. Release notes or Dependabot's proposed
lockfile are not substitutes for testing a clean installation.

## Compatibility review

| Area               | Repository finding                                                                                                                                                                                                                                                                                           | Vite 8 disposition                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node               | Node 24 is pinned in `engines`, `.nvmrc`, CI, and all three Docker build/runtime files.                                                                                                                                                                                                                      | Node 24 compatibility still has to be confirmed from the Vite 8 package metadata. Do not relax the repository's Node range merely to install the update.                                                                                        |
| React plugin       | `@vitejs/plugin-react@4.3.4` declares a Vite peer range ending at Vite 6. It is installed but there is no `vite.config.*`, so the application currently uses Vite's default TypeScript/JSX transform rather than the plugin.                                                                                 | It cannot accompany Vite 8. Select and test an official plugin release whose peer range explicitly includes Vite 8, or remove the unused plugin in a separately justified change.                                                               |
| TypeScript         | TypeScript 5.7.2 performs the application build with project references.                                                                                                                                                                                                                                     | Confirm the Vite 8 client types compile with 5.7.2; coordinate a TypeScript update only if Vite 8 documents a newer minimum.                                                                                                                    |
| React              | React and React DOM are 18.3.1; React Router is 7.1.1.                                                                                                                                                                                                                                                       | No React upgrade should be inferred from a build-tool update. Verify JSX refresh behavior with the compatible plugin.                                                                                                                           |
| Vite configuration | There is no Vite configuration file. Defaults produce the current application and there are no project Rollup hooks, Sass options, custom transforms, or `define` entries.                                                                                                                                   | Review Vite 7's changed default browser target and every Vite 8/Rolldown default before accepting output changes. Add configuration only for a demonstrated requirement.                                                                        |
| Development proxy  | `npm run dev` starts only Vite and defines no proxy. Browser terminology requests use same-origin `/v1/terminology/medications`; the API listens separately on port 3001.                                                                                                                                    | The API development proxy is a pre-existing missing behavior, not something a major upgrade may silently invent. Define and test an explicit `/v1` proxy in a dedicated, security-reviewed change before claiming local live terminology works. |
| Production proxy   | Nginx proxies `/api/` to the API, while the medication client requests `/v1/...`.                                                                                                                                                                                                                            | This pre-existing route mismatch must be resolved independently and regression-tested; it blocks a claim that the production terminology proxy works end to end.                                                                                |
| PWA                | The manifest, offline page, icon, and hand-written service worker are copied from `public/`. Registration is deferred until window `load`, and failed registration is swallowed. The worker caches only public shell resources and refuses authenticated/health/document routes. No Vite PWA plugin is used. | Confirm unchanged URLs, MIME types, cache behavior, and registration in both dev and built output. Do not let the new bundler rewrite or precache sensitive routes.                                                                             |
| Build output       | The frontend image copies `dist` into Nginx; Nginx supplies SPA fallback and disables HTML caching.                                                                                                                                                                                                          | Compare file names, module loading, asset URLs, source maps, target syntax, and image contents with a Vite 6 baseline. Build and smoke-test the Docker image.                                                                                   |
| Codespaces         | There is no `.devcontainer` configuration. Vite is invoked directly and must be given `--host` for remote reachability.                                                                                                                                                                                      | Verify forwarded-port behavior under Node 24. Do not change the default host without reviewing exposure and allowed-host protections.                                                                                                           |
| CI and deployment  | CI uses Node 24 and clean `npm ci`, then typecheck, lint, formatting, unit/integration tests, and build. Docker uses Node 24 Alpine for frontend, API, and worker.                                                                                                                                           | Keep these gates. Also build the frontend container and exercise its Nginx routes before migration approval.                                                                                                                                    |

### Breaking changes that remain to be authenticated

Before changing the pin, reviewers must read and record every Vite 7 and Vite 8
breaking change. At minimum, explicitly validate Node engine changes, browser
target/default output changes, removed or renamed configuration, environment
variable behavior, dev-server host/proxy security, module resolution, CSS and
asset handling, worker/service-worker handling, dependency optimization, the
production bundler transition and Rollup-compatibility layer, and official
plugin API changes. These are migration gates, not assumptions that the project
is unaffected because its configuration is small.

## `brace-expansion` review (separate from Vite)

The current lockfile resolves `brace-expansion@5.0.5` only through the
development-only path `eslint@10.2.1 -> minimatch@10.2.5 ->
brace-expansion@5.0.5`. It is not introduced by Vite and is not shipped in the
static frontend or production `npm ci --omit=dev` images.

The grouped Dependabot change appears to address the brace-expansion regular
expression denial-of-service advisory that affected older release lines. The
post-cleanup lockfile already contains the fixed 5.0.5 line selected by
minimatch, so the smallest safe action on this branch is **no further manifest
or lockfile churn**. CI dependency review must still confirm the advisory and
fixed-version range from GitHub because the registry audit endpoint returns
HTTP 403 here. `npm audit fix --force` was not used.

## Required future migration

1. In a network-enabled clean checkout, retrieve the official Vite 7 and Vite 8
   migration guides and confirm that `vite@8.2.0` is a published, non-yanked
   release.
2. Record Vite 8's exact Node engine and dependency metadata. Confirm Node 24,
   Alpine/musl, CI, Codespaces, and Docker compatibility.
3. Choose an `@vitejs/plugin-react` version whose published peer dependencies
   explicitly accept Vite 8. Upgrade Vite and that plugin atomically. Confirm
   TypeScript 5.7.2 and React 18 compatibility from published peer ranges; make
   no unrelated React or TypeScript upgrade.
4. Resolve the development and production `/v1` proxy behavior separately,
   with tests proving that only the server calls external terminology services
   and that credentials can never reach browser code.
5. Install from scratch and run every repository check. Compare Vite 6 and Vite
   8 production output, build the frontend Docker image, and test it through
   Nginx.
6. In a real browser, exercise home, authentication, dashboard, medication and
   diagnosis autocomplete, the manifest, safe service-worker registration,
   offline fallback, and built assets. Capture console/network logs and verify
   no project-caused Node deprecation warnings.
7. Put the coordinated Vite/plugin lockfile change in its own PR. Keep the
   transitive brace-expansion advisory disposition separate and do not merge
   Dependabot PR #14 wholesale.

## Verification limitations for this evaluation

A clean online `npm ci` could not complete because registry requests are
blocked, and offline installation reported that `xtend` was not cached. The
same network policy prevented `npm audit` and installing Vite 8.2. Therefore
the runtime, browser, Docker, and Vite 8 comparison checks cannot be represented
as passed by this branch. Existing source-level tests cover autocomplete and
service-worker safety, but they are not a substitute for the browser checks
listed above.
