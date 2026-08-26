# Background jobs

Account deletion jobs contain only a deletion-request UUID and use the normal
attested runtime database connection. There is no admin or migration credential
fallback. The worker receives only `EXECUTE` on the fixed-purpose
`complete_account_deletion(uuid)` function, not broad table deletion grants.
The function validates and locks lifecycle state, is idempotent after
completion, and records a fail-closed state for retry.

The durable queue records type, opaque payload reference, status, attempts, schedule/lock/completion times, sanitized failure reason and dead-letter state. Supported types are data export, account deletion, email delivery, malware scanning, document processing, import synchronization, retention cleanup and audit archival. Payloads reference database records or object IDs and must never contain document bodies or raw health content. A future worker must claim rows with `FOR UPDATE SKIP LOCKED`, bound retries, renew locks, audit outcomes and expose content-free queue-depth/error metrics. No production worker or vendor integration is claimed here.
