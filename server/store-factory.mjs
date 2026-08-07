import { MemoryStore } from "./store.mjs";
import { createPool } from "./database.mjs";
import { PostgresStore } from "./postgres-store.mjs";

export async function createStore(env = process.env) {
  const adapter =
    env.DATABASE_ADAPTER || (env.DATABASE_URL ? "postgres" : "memory");
  if (env.NODE_ENV === "production" && adapter !== "postgres")
    throw new Error(
      "Production requires DATABASE_ADAPTER=postgres; memory fallback is prohibited",
    );
  if (adapter === "memory")
    return new MemoryStore(undefined, { sessionPepper: env.SESSION_PEPPER });
  if (adapter !== "postgres")
    throw new Error(`Unsupported DATABASE_ADAPTER: ${adapter}`);
  const store = new PostgresStore(createPool(env), undefined, {
    sessionPepper: env.SESSION_PEPPER,
  });
  try {
    await store.ready();
    return store;
  } catch {
    await store.close();
    throw new Error("PostgreSQL readiness check failed");
  }
}
