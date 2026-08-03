# Health and readiness

`/health/live` reports process life and ignores optional dependency failure. `/health/ready` returns 503 when a required dependency is unavailable. `/health/dependencies` returns only normalized status plus migration version—never secrets, topology, hostnames, stack traces or vendor diagnostics. API, worker, database/migration, terminology, storage, email and scanner checks use the same redacted model. Production required dependencies are configured by deployment and reviewed before launch.
