# Data access layer

The application-facing operation inventory and adapter change procedure are
documented in the [store adapter contract](STORE_ADAPTER_CONTRACT.md). Store
creation validates this contract before the adapter can serve requests.

`MemoryStore` supports tests/demos and `PostgresStore` is production-oriented. `createStore` selects with `DATABASE_ADAPTER`. Services receive a store by dependency injection. PostgreSQL calls use placeholders, bounded pooling, explicit transactions and safe readiness failure. Server authorization remains mandatory; actor/organization transaction settings activate RLS as defense in depth. The store covers accounts and digested tokens, sessions, role approvals, memberships, versioned consent, append-only audit, jobs, export/deletion requests, blocks and reports. The schema additionally persists profiles, health categories, documents/import metadata, moderation, notifications, flags, content reviews and evidence. New endpoints must add repository methods rather than query from request handlers.

Both adapters use the same lookup contract: a singular lookup returns a normalized camelCase object when found and `null` when absent, revoked, or expired; collection lookups return an empty array when no records match. Predicate methods such as membership checks return booleans.
