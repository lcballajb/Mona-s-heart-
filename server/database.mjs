import pg from "pg";

const { Pool } = pg;

export const PROTECTED_RLS_TABLES = Object.freeze([
  "consent_records",
  "conversation_members",
  "conversations",
  "deletion_requests",
  "documents",
  "export_requests",
  "health_entries",
  "imported_records",
  "messages",
  "notifications",
  "organization_memberships",
  "profiles",
]);

const ATTESTATION_ERROR = "PostgreSQL runtime role attestation failed";

export function poolConfig(env = process.env) {
  if (!env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for PostgreSQL");
  const production = env.NODE_ENV === "production";
  if (
    production &&
    (env.DATABASE_SSL !== "true" ||
      env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false")
  )
    throw new Error(
      "Production PostgreSQL requires DATABASE_SSL=true with certificate verification enabled",
    );
  return {
    connectionString: env.DATABASE_URL,
    max: Number(env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(env.DATABASE_CONNECT_TIMEOUT_MS ?? 5_000),
    ssl:
      env.DATABASE_SSL === "true"
        ? {
            rejectUnauthorized:
              env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
          }
        : false,
    application_name: "monas-heart-api",
    options: `-c statement_timeout=${Number(env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10_000)}`,
    allowExitOnIdle: !production,
  };
}

export function createPool(env = process.env) {
  const pool = new Pool(poolConfig(env));
  pool.on("error", () => databaseMetrics.errors++);
  return pool;
}

/**
 * Verify the effective identity and privileges on the same pool used for
 * application queries. Keep failures deliberately generic: role and catalog
 * details are security-sensitive deployment information.
 */
export async function attestRuntimeRole(
  pool,
  { expectedRole = process.env.DB_RUNTIME_USER } = {},
) {
  if (!expectedRole || !/^[a-z_][a-z0-9_]*$/.test(expectedRole))
    throw new Error(ATTESTATION_ERROR);

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query(
      `WITH role_state AS (
         SELECT oid, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb,
                rolreplication
           FROM pg_roles
          WHERE rolname = current_user
       ), protected_tables AS (
         SELECT count(c.oid)::int AS protected_table_count,
                count(c.oid) FILTER (
                  WHERE c.relrowsecurity AND c.relforcerowsecurity
                )::int AS forced_rls_table_count,
                count(c.oid) FILTER (WHERE c.relowner = r.oid)::int AS owned_protected_tables,
                count(c.oid) FILTER (
                  WHERE c.relowner <> r.oid
                    AND pg_has_role(current_user, c.relowner, 'MEMBER')
                )::int AS member_owned_protected_tables,
                count(c.oid) FILTER (
                  WHERE has_table_privilege(current_user, c.oid, 'TRUNCATE')
                )::int AS truncatable_protected_tables
           FROM role_state r
           LEFT JOIN pg_class c
             ON c.relnamespace = 'public'::regnamespace
            AND c.relkind IN ('r', 'p')
            AND c.relname = ANY($1::text[])
          GROUP BY r.oid
       ), unsafe_memberships AS (
         SELECT count(*)::int AS unsafe_role_count
           FROM pg_roles candidate
          WHERE candidate.oid <> (SELECT oid FROM role_state)
            AND pg_has_role(current_user, candidate.oid, 'MEMBER')
            AND (
              candidate.rolsuper OR candidate.rolbypassrls OR
              candidate.rolcreaterole OR candidate.rolcreatedb OR
              candidate.rolreplication OR
              candidate.rolname = ANY(ARRAY[
                'pg_read_server_files', 'pg_write_server_files',
                'pg_execute_server_program'
              ])
            )
       )
       SELECT current_user AS current_role,
              session_user AS session_role,
              r.rolsuper,
              r.rolbypassrls,
              r.rolcreaterole,
              r.rolcreatedb,
              r.rolreplication,
              current_setting('row_security') <> 'off' AS row_security_enabled,
              has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public,
              has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_in_database,
              p.protected_table_count,
              p.forced_rls_table_count,
              p.owned_protected_tables,
              p.member_owned_protected_tables,
              p.truncatable_protected_tables,
              u.unsafe_role_count
         FROM role_state r
         CROSS JOIN protected_tables p
         CROSS JOIN unsafe_memberships u`,
      [PROTECTED_RLS_TABLES],
    );
    const role = rows[0];
    const safe =
      role &&
      role.current_role === expectedRole &&
      role.session_role === expectedRole &&
      role.rolsuper === false &&
      role.rolbypassrls === false &&
      role.rolcreaterole === false &&
      role.rolcreatedb === false &&
      role.rolreplication === false &&
      role.row_security_enabled === true &&
      role.can_create_in_public === false &&
      role.can_create_in_database === false &&
      role.protected_table_count === PROTECTED_RLS_TABLES.length &&
      role.forced_rls_table_count === PROTECTED_RLS_TABLES.length &&
      role.owned_protected_tables === 0 &&
      role.member_owned_protected_tables === 0 &&
      role.truncatable_protected_tables === 0 &&
      role.unsafe_role_count === 0;
    if (!safe) throw new Error(ATTESTATION_ERROR);
    return true;
  } catch {
    throw new Error(ATTESTATION_ERROR);
  } finally {
    client?.release();
  }
}

export const databaseMetrics = {
  queries: 0,
  errors: 0,
  rollbacks: 0,
  queryLatencyMs: 0,
  connectionWaitMs: 0,
};

export async function timedQuery(client, text, values = []) {
  const started = performance.now();
  databaseMetrics.queries++;
  try {
    return await client.query(text, values);
  } catch (error) {
    databaseMetrics.errors++;
    throw error;
  } finally {
    databaseMetrics.queryLatencyMs += performance.now() - started;
  }
}
