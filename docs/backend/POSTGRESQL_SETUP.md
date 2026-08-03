# PostgreSQL setup

Use PostgreSQL 16+ and Node 24 LTS. Create separate owner/migrator and runtime roles; grant the runtime role only required schema usage, table DML and sequence usage, without `BYPASSRLS`. Set server-only `DATABASE_URL`, `DATABASE_ADAPTER=postgres`, TLS, pool and timeout variables from `.env.example`; never use `VITE_*`. Run `npm run db:migrate`, then `npm run db:seed`. The seed is fictional and idempotent. Local development defaults to memory only when neither adapter nor URL selects PostgreSQL. Production explicitly requires PostgreSQL and exits on failed readiness.

Tests require a disposable database in `TEST_DATABASE_URL`; never point it at staging or production. The remaining production work is managed database/vendor selection, certificate and secret-manager integration, capacity testing, and formal privacy, legal and cybersecurity review.
