# Environment-variable and configuration reference

`.env.example` is the machine-adjacent inventory; this document classifies ownership and production requirements. Never commit values. `VITE_*` is browser-visible and must not carry secrets.

`server/config.mjs` is the authoritative API startup parser. It validates bounded numeric settings and allowed origins before opening a socket. In production it rejects a non-PostgreSQL adapter, missing or placeholder session/rate-limit secrets, console email, in-memory rate limiting, and an empty trusted-proxy list. Errors name settings but never include their values.

| Group             | Variables                                                                                                   | Production rule                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Runtime           | `NODE_ENV`, `API_HOST`, `API_PORT`, `PUBLIC_APP_URL`                                                        | Explicit production values; canonical HTTPS URL; bind/network exposure reviewed                             |
| Database          | `DATABASE_ADAPTER`, `DATABASE_URL`, `DATABASE_SSL*`, pool/connect/statement timeouts                        | PostgreSQL only; secret manager; verified TLS; least-privilege roles; tested readiness/migrations           |
| Sessions/security | `SESSION_PEPPER`, `CSRF_SECRET`, `RATE_LIMIT_HASH_KEY`, `LOG_HASH_KEY`, `CORS_ALLOWLIST`, `TRUSTED_PROXIES` | Unique managed secrets; rotation/revocation; exact origins/proxies; no wildcard production values           |
| Object storage    | `OBJECT_STORAGE_*`, `OBJECT_KEY_ENCRYPTION_KEY`, `MALWARE_SCANNER_ENDPOINT`                                 | Reviewed non-mock providers; private bucket/IAM/KMS; quarantine and fail-closed scan                        |
| Email             | `EMAIL_PROVIDER` and future provider credentials                                                            | Console forbidden; authenticated domain, suppression/consent and webhook validation                         |
| Shared services   | `RATE_LIMIT_PROVIDER`, `CACHE_PROVIDER`, `WORKER_CONCURRENCY`                                               | Shared durable providers; capacity/idempotency/dead-letter monitoring                                       |
| Backup/monitoring | `BACKUP_DESTINATION`, `BACKUP_KMS_KEY_ID`, `ERROR_MONITORING_DSN`                                           | Approved encrypted destination/provider; restore/alert evidence; DSN server-side                            |
| Terminology       | `RXNORM_*`, `SNOMED_*`                                                                                      | Server-only; licensing, region, URL/egress and provenance approved                                          |
| AI                | `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`                                                       | Disabled by default; exact approved model plus contract/security/privacy/clinical gates; server-only secret |

Configuration changes use protected environment controls, two-person review for production secrets/high-risk flags, audit evidence, rotation register and rollback. A value being present does not mean its vendor/control is approved.
