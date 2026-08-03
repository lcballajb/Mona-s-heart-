# Test matrix

`npm test` runs all `tests/*.test.mjs`; this includes the PostgreSQL test file,
which intentionally skips only when `TEST_DATABASE_URL` is absent. CI supplies a
PostgreSQL 16 service and URL, then also runs `npm run test:postgres`, so the
integration suite cannot silently skip there. Local PostgreSQL execution needs a
non-production test database. No test is intentionally disabled in CI.

| Test file                             | Area and notable regression coverage                                                                                                                                 | Provider/store                       | Classification                                               | Local / CI         | Can skip and why                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------- |
| `tests/backend.test.mjs`              | identity, authorization, sender/recipient privacy, organization isolation, consent, export/deletion, blocks/reports                                                  | MemoryStore                          | integration; security; privacy; regression                   | Yes / yes          | No                                                                                           |
| `tests/database.test.mjs`             | TLS, null singular lookups, normalized adapter contract, organization RLS context                                                                                    | MemoryStore and mocked PostgresStore | unit; contract; security; regression                         | Yes / yes          | PostgreSQL module cases only if dependency is unavailable; `npm ci` makes it available in CI |
| `tests/operations.test.mjs`           | production provider fail-closed behavior, uploads/malware, worker retry, bounded rate limits, readiness/redaction, CORS/proxy, password-reset enumeration resistance | Memory providers                     | integration; security; privacy; regression                   | Yes / yes          | No                                                                                           |
| `tests/postgres.integration.test.mjs` | migrations, seed idempotency, real adapter isolation and persistence                                                                                                 | PostgreSQL 16                        | integration; contract; privacy; regression                   | With test DB / yes | Locally when `TEST_DATABASE_URL` is absent; CI provides it and rejects production-like URLs  |
| `tests/safety.test.mjs`               | medical refusals/emergency escalation, flags, privacy defaults, autocomplete accessibility, confirmations, warnings, secret/fixture scan                             | Static/client modules                | medical-safety; accessibility; privacy; security; regression | Yes / yes          | No                                                                                           |
| `tests/terminology.test.mjs`          | RxNorm normalization/cache/fallback/circuit behavior, provenance, review state, same-origin browser boundary                                                         | Mocked provider/cache                | unit; integration; medical-safety; privacy; regression       | Yes / yes          | No                                                                                           |

## Explicit gaps retained for follow-up

The current dependency set has no browser DOM test runner. UI state regressions
(message sender rendering, group-conversation selection, document and medication
form persistence, matching/diagnosis filters, reset routing, and stale
autocomplete state) are partly guarded by TypeScript, build, and static safety
assertions but do not have user-event tests. Adding a DOM runner and converting
these to behavioral tests should be a focused testing PR, not hidden inside a
cleanup dependency update. API HTTP parsing/session/CSRF behavior likewise needs
request-level tests once the routing surface is finalized; service-level privacy,
export scoping, redaction, proxy, rate-limit, TLS, and production fail-closed
controls are covered above. Defense-in-depth tests were retained.
