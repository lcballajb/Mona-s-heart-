# Worker architecture

The separate worker claims PostgreSQL rows with `FOR UPDATE SKIP LOCKED`, expiring leases, bounded concurrency, correlation IDs and idempotency keys. It handles email, exports, deletion, scanning, retention, token/export cleanup, audit archival, notifications and future processing by opaque references only. Failures use exponential backoff, capped attempts and dead letters. SIGTERM/SIGINT stops polling. Alert on queue age/depth and dead letters. Redis, SQS, Service Bus and Pub/Sub require a future ADR and equivalent privacy/idempotency guarantees.
