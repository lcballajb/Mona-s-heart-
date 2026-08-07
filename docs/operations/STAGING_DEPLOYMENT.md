# Staging deployment

The compose plan runs PostgreSQL, one-shot migration, API, worker, static frontend and nginx reverse proxy. Use fictional data only. Secrets are mounted/injected from a staging secret manager; `.env` contains references, never values. TLS terminates at the managed ingress, which is the only trusted proxy. Route stdout JSON and provider metrics to the staging sink. Deploy migrations, API, worker, then frontend; validate readiness and smoke tests. Roll back images to the prior digest; never reverse destructive migrations without an approved recovery plan. Redis is optional only after a shared-adapter implementation.

## API termination contract

The API handles `SIGTERM` and `SIGINT` as a single idempotent shutdown request. It stops accepting connections, allows active requests up to ten seconds to drain, then closes remaining connections and the database store. A cleanup error or drain timeout sets a failing process exit code. Logs contain only the signal, outcome, and failure count; provider errors and secrets are not emitted. Platform termination grace periods must exceed ten seconds. Readiness removal before sending `SIGTERM` remains the responsibility of the selected deployment platform.
