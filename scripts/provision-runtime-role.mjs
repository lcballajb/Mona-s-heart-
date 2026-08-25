import pg from "pg";

const { Client } = pg;
const adminUrl = process.env.DB_ADMIN_URL;
const runtimeUser = process.env.DB_RUNTIME_USER;
const runtimePassword = process.env.DB_RUNTIME_PASSWORD;

if (!adminUrl || !runtimeUser || !runtimePassword)
  throw new Error(
    "DB_ADMIN_URL, DB_RUNTIME_USER, and DB_RUNTIME_PASSWORD are required",
  );
if (!/^[a-z_][a-z0-9_]*$/.test(runtimeUser))
  throw new Error("DB_RUNTIME_USER must be a simple PostgreSQL identifier");

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const identifier = quoteIdentifier(runtimeUser);
const client = new Client({ connectionString: adminUrl, ssl: false });
await client.connect();
try {
  await client.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
  const existing = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname = $1",
    [runtimeUser],
  );
  if (existing.rowCount === 0)
    await client.query(
      `CREATE ROLE ${identifier} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`,
    );
  else
    await client.query(
      `ALTER ROLE ${identifier} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`,
    );
  const passwordCommand = await client.query(
    "SELECT format('ALTER ROLE %I PASSWORD %L', $1::text, $2::text) AS sql",
    [runtimeUser, runtimePassword],
  );
  await client.query(passwordCommand.rows[0].sql);
  const database = await client.query("SELECT current_database() AS name");
  await client.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(database.rows[0].name)} TO ${identifier}`,
  );
  await client.query(`GRANT USAGE ON SCHEMA public TO ${identifier}`);
  await client.query(
    `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${identifier}`,
  );
  await client.query(
    `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${identifier}`,
  );
  const readableTables = [
    "account_tokens",
    "audit_events",
    "background_jobs",
    "blocks",
    "consent_records",
    "content_reviews",
    "deletion_requests",
    "documents",
    "evidence_sources",
    "export_requests",
    "feature_flags",
    "health_entries",
    "imported_records",
    "moderation_actions",
    "notifications",
    "organization_memberships",
    "organizations",
    "profiles",
    "reports",
    "role_approvals",
    "sessions",
    "user_roles",
    "users",
  ].map(quoteIdentifier);
  const insertableTables = readableTables;
  const updatableTables = [
    "account_tokens",
    "background_jobs",
    "feature_flags",
    "profiles",
    "sessions",
    "users",
  ].map(quoteIdentifier);
  await client.query(
    `GRANT SELECT ON TABLE ${readableTables.join(",")} TO ${identifier}`,
  );
  await client.query(
    `GRANT INSERT ON TABLE ${insertableTables.join(",")} TO ${identifier}`,
  );
  await client.query(
    `GRANT UPDATE ON TABLE ${updatableTables.join(",")} TO ${identifier}`,
  );
  await client.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${identifier}`,
  );
} finally {
  await client.end();
}
