export class InMemorySharedCache {
  constructor({ clock = () => Date.now(), maxKeys = 5000 } = {}) {
    this.clock = clock;
    this.maxKeys = maxKeys;
    this.values = new Map();
  }
  async get(key) {
    const row = this.values.get(key);
    if (!row || row.expiresAt <= this.clock()) {
      this.values.delete(key);
      return null;
    }
    return structuredClone(row.value);
  }
  async set(key, value, ttlMs) {
    if (!this.values.has(key) && this.values.size >= this.maxKeys)
      this.values.delete(this.values.keys().next().value);
    this.values.set(key, {
      value: structuredClone(value),
      expiresAt: this.clock() + ttlMs,
    });
  }
}
export function createSharedCache({
  environment = process.env.NODE_ENV,
  provider = process.env.CACHE_PROVIDER,
} = {}) {
  if (environment !== "production" && (!provider || provider === "memory"))
    return new InMemorySharedCache();
  throw new Error("A shared PostgreSQL or Redis-compatible cache is required");
}
