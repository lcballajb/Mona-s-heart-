# ADR-004: PostgreSQL persistence with node-postgres

**Status:** Accepted. **Owner:** Prominent Life Investments.

## Decision

Use maintained `pg`/node-postgres behind a dependency-injected store contract. It fits the existing SQL-first schema, supports parameterized queries, pooling and explicit transactions, and avoids an ORM migration model that would duplicate reviewed SQL. MemoryStore remains a non-production demo/test adapter. Prisma and Drizzle were considered; both add generated schemas and abstractions without a current need. A bespoke driver was rejected as unsafe and unmaintainable.

## Behavior and implications

Ordered checksum-verified SQL migrations run once under an advisory deployment process and each unapplied file is transactional. Runtime transactions pin one pool client, set local actor context for defense-in-depth RLS, commit on success, and roll back on error. The bounded pool configures connection, idle and statement timeouts; TLS verification defaults on when TLS is enabled. Production startup requires the PostgreSQL adapter and a successful readiness query—there is no memory fallback.

The runtime role should have DML/sequence access but no DDL, role-management, bypass-RLS, or migration-history mutation. A separate deploy role applies migrations. Parameterization, generic public errors, digest-only tokens, encrypted health fields, server authorization, and RLS are complementary controls; PostgreSQL does not itself establish regulatory compliance. Operations must monitor pool saturation, query latency/errors, rollback count, migration version and queue depth without health content.

## Migration, rollback, and lock-in

Changes roll forward. Destructive changes require explicit privacy, cybersecurity, database-owner and restore-plan review. If release rollback needs an old binary, first deploy a backward-compatible compensating migration; restore an encrypted point-in-time backup only for a declared incident. Checksums expose edited history and transactions prevent partial files where PostgreSQL permits. SQL uses PostgreSQL types, partial indexes, RLS and `pgcrypto`, creating intentional PostgreSQL lock-in; the store contract limits application lock-in but migration to another database requires schema/policy translation.
