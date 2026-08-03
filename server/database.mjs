import pg from "pg";

const { Pool } = pg;

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
