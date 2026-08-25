# PostgreSQL setup

Use PostgreSQL 16+ and Node 24 LTS. Supply a schema-owner/migrator credential in server-only `DB_ADMIN_URL` and a separate restricted, non-owner application credential in `DATABASE_URL`; never use `VITE_*`. Migrations and the fictional idempotent seed require `DB_ADMIN_URL`. The application uses only `DATABASE_URL`.

Infrastructure must provision the runtime login outside ordinary migrations as `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`, revoke schema creation, and grant only database connect, schema usage, required table DML, and sequence usage. CI uses `npm run db:provision-runtime` for its disposable database; production infrastructure should enforce the equivalent role policy. Run `npm run db:migrate`, `npm run db:seed`, then provision/grant the runtime identity. Set `DATABASE_ADAPTER=postgres`, TLS, pool, and timeout variables from `.env.example`. Production explicitly requires PostgreSQL and exits on failed readiness.

Tests require `DB_ADMIN_URL` for setup and a disposable restricted runtime database in `TEST_DATABASE_URL`; never point either at staging or production. The remaining production work is managed database/vendor selection, certificate and secret-manager integration, capacity testing, and formal privacy, legal and cybersecurity review.
