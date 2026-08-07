# Store adapter contract

The application persistence boundary is defined by
`server/store-contract.mjs`. Both the deterministic in-memory test adapter and
the production PostgreSQL adapter must implement every listed operation. The
factory validates the selected adapter before returning it, so an incomplete
adapter fails during startup rather than later in a user request.

Infrastructure operations such as raw SQL queries, transactions, readiness,
metrics, and connection shutdown are intentionally outside the shared
application contract because they are PostgreSQL-specific. The memory adapter
is for local development and deterministic tests only; contract parity does not
make it an approved production persistence mechanism.

## Change procedure

1. Add or change the application operation in both adapters.
2. Keep authorization and ownership checks equivalent. Never treat the memory
   adapter as evidence that PostgreSQL row-level security is complete.
3. Add adapter-neutral contract coverage and PostgreSQL integration evidence.
4. Update this document and the data-access documentation when semantics or
   architecture change.

The contract currently validates callable operation presence. Return-shape,
transaction, concurrency, lifecycle, and failure-semantics parity remain the
next E4 increments. KMS-backed encryption and production retention/deletion
execution remain blocked on reviewed infrastructure and privacy decisions.
