# Repository health audit

Date: 2026-08-03. Scope: the merge commit containing production services and all
tracked application, server, database, deployment, workflow, test, and document
files. This is a point-in-time engineering review, not a compliance assessment.

## Status

- **Toolchain:** Node 24 LTS, npm lockfile v3, TypeScript, Vite, ESLint, and
  Prettier are aligned across local, Docker, and CI configuration.
- **Repository:** no alternate lockfiles, tracked build output, logs, local
  databases, backups, temporary files, merge markers, or obvious credentials
  were found. `.gitkeep` is intentionally retained to preserve the repository
  placeholder.
- **Runtime:** production database and development-provider selection fail
  closed; verified PostgreSQL TLS is required. The application remains a
  prototype and must use fictional data.
- **CI:** migration, twice-run seed, types, lint, formatting, unit/regression
  tests, mandatory PostgreSQL integration, build, backup/restore dry runs,
  dependency review, and checkout cleanliness are enforced. GitHub-native secret
  scanning must be enabled in repository settings.
- **Residual risk:** registry and GitHub API access were unavailable, so current
  advisories and open Dependabot PRs require independent, network-enabled review.
  Browser user-event coverage remains incomplete (see the test matrix).

## Environment-variable inventory

All variables are server scoped; no `VITE_*` secret exists. Values in
`.env.example` are placeholders, not credentials. “Fail” describes invalid or
missing production configuration. Test-only `TEST_DATABASE_URL` and operational
`BACKUP_TEMP_FILE` are intentionally not in `.env.example`.

| Name                                       | Purpose / default                            | Required and production behavior                       | Secret / flag             | Failure behavior                                     |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------ | ------------------------- | ---------------------------------------------------- |
| `NODE_ENV`                                 | runtime mode; `development`                  | Required operationally; use `production` in production | No / no                   | Safe-mode checks may not activate if mis-set         |
| `API_HOST`, `API_PORT`                     | bind address; `127.0.0.1`, `3001`            | Optional                                               | No / no                   | Invalid port rejects startup                         |
| `PUBLIC_APP_URL`                           | public link origin; localhost                | Required for production email links                    | No / no                   | Production email provider validation fails           |
| `CORS_ALLOWLIST`                           | comma-separated origins; localhost           | Required in production                                 | No / no                   | Unlisted origins rejected; wildcard is not used      |
| `TRUSTED_PROXIES`                          | explicit proxy addresses; empty              | Required when deployed behind a proxy                  | No / no                   | Forwarded addresses are not trusted                  |
| `DATABASE_ADAPTER`                         | `memory` or `postgres`; memory               | Must be `postgres` in production                       | No / flag                 | Production startup fails closed                      |
| `DATABASE_URL`                             | PostgreSQL connection; placeholder           | Required for PostgreSQL/production                     | Yes / no                  | Startup/migration fails                              |
| `TEST_DATABASE_URL`                        | isolated integration database; none          | Test-only                                              | Yes / no                  | PostgreSQL test skips locally; CI always supplies it |
| `DATABASE_SSL`                             | TLS toggle; true in example                  | Must be true in production                             | No / flag                 | Production startup fails                             |
| `DATABASE_SSL_REJECT_UNAUTHORIZED`         | certificate verification; true               | Must remain true in production                         | No / flag                 | Production startup fails                             |
| `DATABASE_POOL_MAX`                        | pool bound; 10                               | Optional                                               | No / no                   | Invalid values rejected/defaulted by config          |
| `DATABASE_IDLE_TIMEOUT_MS`                 | idle timeout; 30000                          | Optional                                               | No / no                   | Invalid config rejected/defaulted                    |
| `DATABASE_CONNECT_TIMEOUT_MS`              | connect timeout; 5000                        | Optional                                               | No / no                   | Connection fails within bound                        |
| `DATABASE_STATEMENT_TIMEOUT_MS`            | statement timeout; 10000                     | Optional                                               | No / no                   | Long query is cancelled                              |
| `SESSION_PEPPER`, `CSRF_SECRET`            | session/CSRF key material; placeholder       | Required production secrets                            | Yes / no                  | Production configuration must fail validation        |
| `RATE_LIMIT_PROVIDER`                      | limiter adapter; memory                      | Shared provider required for scaled production         | No / flag                 | Unsupported provider fails closed                    |
| `RATE_LIMIT_HASH_KEY`                      | privacy-preserving key HMAC; placeholder     | Required in production                                 | Yes / no                  | Production provider validation fails                 |
| `CACHE_PROVIDER`                           | cache adapter; memory                        | Shared provider required for scaled production         | No / flag                 | Unsupported provider fails closed                    |
| `EMAIL_PROVIDER`                           | delivery adapter; console                    | Real provider required in production                   | No / flag                 | Console adapter fails closed in production           |
| `OBJECT_STORAGE_PROVIDER`                  | storage adapter; development mock            | Real private provider required in production           | No / flag                 | Mock fails closed in production                      |
| `OBJECT_STORAGE_BUCKET`                    | private bucket name; development placeholder | Required by real provider                              | No / no                   | Provider cannot initialize                           |
| `OBJECT_STORAGE_KMS_KEY_ID`                | storage KMS reference; placeholder           | Production-provider specific                           | Sensitive reference / no  | Provider cannot initialize                           |
| `OBJECT_KEY_ENCRYPTION_KEY`                | opaque object-key encryption; placeholder    | Required production secret                             | Yes / no                  | Storage initialization fails                         |
| `MALWARE_SCANNER_ENDPOINT`                 | scanner endpoint; invalid placeholder        | Required before uploaded content is released           | Sensitive / no            | Upload remains quarantined/fails closed              |
| `WORKER_CONCURRENCY`                       | worker bound; 2                              | Optional                                               | No / no                   | Invalid value is rejected/bounded                    |
| `BACKUP_DESTINATION`, `BACKUP_KMS_KEY_ID`  | encrypted backup targets; placeholders       | Required for real backups                              | Sensitive references / no | Non-dry-run backup fails                             |
| `BACKUP_TEMP_FILE`                         | local pg dump path; `/tmp/mona.dump`         | Optional operational override                          | Sensitive path / no       | Backup command fails safely                          |
| `ERROR_MONITORING_DSN`                     | server monitoring endpoint; placeholder      | Optional until provider configured                     | Yes / flag                | Monitoring disabled/provider fails                   |
| `LOG_HASH_KEY`                             | stable redacted log correlation; placeholder | Required for production correlation                    | Yes / no                  | Production observability validation fails            |
| `AI_ENABLED`                               | AI master switch; false                      | Optional; keep false without approvals                 | No / flag                 | AI remains unavailable                               |
| `AI_PROVIDER`, `AI_API_KEY`                | future provider/config; empty                | Required only if approved AI is enabled                | API key is secret / flag  | AI remains disabled; no mock production fallback     |
| `RXNORM_PROXY_ENABLED`                     | official proxy switch; false                 | Optional                                               | No / flag                 | Fictional fallback is labeled unverified             |
| `RXNORM_TIMEOUT_MS`                        | request bound; 3000                          | Optional                                               | No / no                   | Provider times out/falls back safely                 |
| `RXNORM_CACHE_TTL_MS`                      | positive TTL; 900000                         | Optional                                               | No / no                   | Invalid value uses guarded configuration             |
| `RXNORM_NEGATIVE_CACHE_TTL_MS`             | negative TTL; 60000                          | Optional                                               | No / no                   | Invalid value uses guarded configuration             |
| `SNOMED_PROVIDER_ENABLED`                  | licensed provider switch; false              | Optional; requires license/review                      | No / flag                 | Diagnosis provider stays unavailable                 |
| `SNOMED_SERVER_URL`, `SNOMED_SERVER_TOKEN` | licensed endpoint/auth; invalid placeholder  | Required only when enabled                             | Token is secret / flag    | Provider remains disabled/fails initialization       |

## Security, privacy, and medical-safety review

Reviewed authentication/authorization, cookies/session handling, CSRF/export
boundaries, CORS/proxy parsing, input/rate limits, SQL parameterization, object
keys, provider factories, logging/redaction, organization scoping, TLS, and test
fixtures. Existing controls and regression tests were retained. No wildcard CORS,
client secret convention, hard-coded key, obvious real PHI fixture, production
MemoryStore fallback, or production mock-provider fallback was identified.

Medical guardrails continue to refuse diagnosis, prescribing/dose, stopping a
medication, supplement replacement/cure, treatment planning, and attempts to
bypass policy; emergency language escalates to local emergency services.
Terminology fallback is marked unverified, educational review state is required,
and accessible warnings say the prototype is not medical advice. Imaging
interpretation is not implemented. These controls do not establish clinical
validation, regulatory approval, or HIPAA compliance. Specialist threat-model,
privacy, accessibility, clinical-content, deployment, and penetration reviews
remain required before any live-data use.
