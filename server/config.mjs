const PLACEHOLDER = /replace_with|example\.invalid|development-only/i;

function integer(name, value, { minimum, maximum }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  return parsed;
}

function url(name, value, protocols) {
  try {
    const parsed = new URL(value);
    if (!protocols.includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${name} must be a valid ${protocols.join(" or ")} URL`);
  }
}

function csv(name, value, { required = false, origins = false } = {}) {
  const entries = String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (required && entries.length === 0) throw new Error(`${name} is required`);
  if (origins)
    for (const entry of entries) {
      const parsed = new URL(url(name, entry, ["http:", "https:"]));
      if (parsed.origin !== entry || parsed.pathname !== "/")
        throw new Error(`${name} entries must be origins without paths`);
    }
  return Object.freeze(entries);
}

function productionSecret(errors, env, name, minimumLength = 32) {
  const value = env[name] ?? "";
  if (value.length < minimumLength || PLACEHOLDER.test(value))
    errors.push(
      `${name} must be a non-placeholder secret of at least ${minimumLength} characters`,
    );
}

/**
 * Parse API configuration once at startup. Production validation is deliberately
 * fail-closed; this function never logs configuration values or secrets.
 */
export function loadApiConfig(env = process.env) {
  const errors = [];
  const environment = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(environment))
    errors.push("NODE_ENV must be development, test, or production");

  let port;
  let rxnormTimeoutMs;
  let rxnormCacheTtlMs;
  let rxnormNegativeCacheTtlMs;
  let corsAllowlist = Object.freeze([]);
  let trustedProxies = Object.freeze([]);
  try {
    port = integer("API_PORT", env.API_PORT ?? "3001", {
      minimum: 1,
      maximum: 65535,
    });
  } catch (error) {
    errors.push(error.message);
  }
  for (const [name, fallback, limits, assign] of [
    [
      "RXNORM_TIMEOUT_MS",
      "3000",
      { minimum: 100, maximum: 30_000 },
      (v) => (rxnormTimeoutMs = v),
    ],
    [
      "RXNORM_CACHE_TTL_MS",
      "900000",
      { minimum: 1_000, maximum: 86_400_000 },
      (v) => (rxnormCacheTtlMs = v),
    ],
    [
      "RXNORM_NEGATIVE_CACHE_TTL_MS",
      "60000",
      { minimum: 1_000, maximum: 3_600_000 },
      (v) => (rxnormNegativeCacheTtlMs = v),
    ],
  ]) {
    try {
      assign(integer(name, env[name] ?? fallback, limits));
    } catch (error) {
      errors.push(error.message);
    }
  }
  try {
    corsAllowlist = csv(
      "CORS_ALLOWLIST",
      env.CORS_ALLOWLIST ?? "http://localhost:5173",
      {
        required: environment === "production",
        origins: true,
      },
    );
  } catch (error) {
    errors.push(error.message);
  }
  try {
    trustedProxies = csv("TRUSTED_PROXIES", env.TRUSTED_PROXIES, {
      required: environment === "production",
    });
  } catch (error) {
    errors.push(error.message);
  }

  if (environment === "production") {
    if (env.DATABASE_ADAPTER !== "postgres")
      errors.push("DATABASE_ADAPTER must be postgres in production");
    try {
      url("DATABASE_URL", env.DATABASE_URL, ["postgres:", "postgresql:"]);
      if (PLACEHOLDER.test(env.DATABASE_URL))
        errors.push("DATABASE_URL must not contain a placeholder credential");
    } catch (error) {
      errors.push(error.message);
    }
    productionSecret(errors, env, "SESSION_PEPPER");
    productionSecret(errors, env, "RATE_LIMIT_HASH_KEY");
    if (!env.EMAIL_PROVIDER || env.EMAIL_PROVIDER === "console")
      errors.push("EMAIL_PROVIDER must select an approved production adapter");
    if (!env.RATE_LIMIT_PROVIDER || env.RATE_LIMIT_PROVIDER === "memory")
      errors.push(
        "RATE_LIMIT_PROVIDER must select a shared production adapter",
      );
  }

  if (errors.length)
    throw new Error(`Invalid API configuration:\n- ${errors.join("\n- ")}`);

  return Object.freeze({
    environment,
    production: environment === "production",
    host: env.API_HOST ?? "127.0.0.1",
    port,
    corsAllowlist,
    trustedProxies,
    rxnorm: Object.freeze({
      enabled: env.RXNORM_PROXY_ENABLED === "true",
      timeoutMs: rxnormTimeoutMs,
      cacheTtlMs: rxnormCacheTtlMs,
      negativeCacheTtlMs: rxnormNegativeCacheTtlMs,
    }),
  });
}
