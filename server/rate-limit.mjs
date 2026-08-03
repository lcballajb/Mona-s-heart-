import { createHmac } from "node:crypto";

export function privacyKey(
  scope,
  identity,
  secret = process.env.RATE_LIMIT_HASH_KEY ?? "development-only",
) {
  return `${scope}:${createHmac("sha256", secret).update(identity).digest("hex").slice(0, 32)}`;
}
export class InMemoryRateLimiter {
  constructor({ clock = () => Date.now(), maxKeys = 10_000 } = {}) {
    this.clock = clock;
    this.maxKeys = maxKeys;
    this.buckets = new Map();
  }
  async consume(key, { limit, windowMs }) {
    const now = this.clock();
    for (const [candidate, row] of this.buckets)
      if (row.expiresAt <= now) this.buckets.delete(candidate);
    if (!this.buckets.has(key) && this.buckets.size >= this.maxKeys)
      return { allowed: false, retryAfterMs: windowMs, reason: "capacity" };
    const row = this.buckets.get(key) ?? {
      count: 0,
      expiresAt: now + windowMs,
    };
    row.count += 1;
    this.buckets.set(key, row);
    return {
      allowed: row.count <= limit,
      retryAfterMs: Math.max(0, row.expiresAt - now),
    };
  }
}
export function createRateLimiter({
  environment = process.env.NODE_ENV,
  provider = process.env.RATE_LIMIT_PROVIDER,
} = {}) {
  if (environment !== "production" && (!provider || provider === "memory"))
    return new InMemoryRateLimiter();
  throw new Error(
    "A shared PostgreSQL or Redis-compatible rate limiter is required",
  );
}
