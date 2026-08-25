import { MemoryStore } from "./store.mjs";
import { attestRuntimeRole, createPool } from "./database.mjs";
import { PostgresStore } from "./postgres-store.mjs";
import { assertStoreContract } from "./store-contract.mjs";

export async function createStore(env = process.env) {
  const adapter =
    env.DATABASE_ADAPTER || (env.DATABASE_URL ? "postgres" : "memory");
  if (env.NODE_ENV === "production" && adapter !== "postgres")
    throw new Error(
      "Production requires DATABASE_ADAPTER=postgres; memory fallback is prohibited",
    );
  if (adapter === "memory")
    return assertStoreContract(
      new MemoryStore(undefined, { sessionPepper: env.SESSION_PEPPER }),
    );
  if (adapter !== "postgres")
    throw new Error(`Unsupported DATABASE_ADAPTER: ${adapter}`);
  const pool = createPool(env);
  const store = new PostgresStore(pool, undefined, {
    sessionPepper: env.SESSION_PEPPER,
  });
  try {
    await attestRuntimeRole(pool, { expectedRole: env.DB_RUNTIME_USER });
    await store.ready();
    return assertStoreContract(store);
  } catch {
    await store.close();
    throw new Error("PostgreSQL readiness check failed");
  }
}
