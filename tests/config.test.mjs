import test from "node:test";
import assert from "node:assert/strict";
import { loadApiConfig } from "../server/config.mjs";

test("development configuration has bounded, typed defaults", () => {
  const config = loadApiConfig({ NODE_ENV: "development" });
  assert.equal(config.port, 3001);
  assert.equal(config.rxnorm.enabled, false);
  assert.deepEqual(config.corsAllowlist, ["http://localhost:5173"]);
  assert.equal(Object.isFrozen(config), true);
});

test("invalid numeric and origin settings are reported together", () => {
  assert.throws(
    () =>
      loadApiConfig({
        NODE_ENV: "development",
        API_PORT: "not-a-port",
        RXNORM_TIMEOUT_MS: "1",
        CORS_ALLOWLIST: "https://app.example.test/a-path",
      }),
    (error) => {
      assert.match(error.message, /API_PORT/);
      assert.match(error.message, /RXNORM_TIMEOUT_MS/);
      assert.match(error.message, /CORS_ALLOWLIST/);
      return true;
    },
  );
});

test("production rejects fallback adapters, placeholders, and absent proxies", () => {
  assert.throws(
    () =>
      loadApiConfig({
        NODE_ENV: "production",
        DATABASE_ADAPTER: "memory",
        DATABASE_URL:
          "postgresql://app:REPLACE_WITH_SECRET@database.internal/mona",
        SESSION_PEPPER: "REPLACE_WITH_SECRET_MANAGER_REFERENCE",
        RATE_LIMIT_HASH_KEY: "development-only-development-only",
        EMAIL_PROVIDER: "console",
        RATE_LIMIT_PROVIDER: "memory",
        CORS_ALLOWLIST: "https://app.example.test",
      }),
    (error) => {
      for (const setting of [
        "DATABASE_ADAPTER",
        "DATABASE_URL",
        "SESSION_PEPPER",
        "RATE_LIMIT_HASH_KEY",
        "EMAIL_PROVIDER",
        "RATE_LIMIT_PROVIDER",
        "TRUSTED_PROXIES",
      ])
        assert.match(error.message, new RegExp(setting));
      assert.doesNotMatch(
        error.message,
        /REPLACE_WITH_SECRET_MANAGER_REFERENCE/,
      );
      return true;
    },
  );
});

test("production accepts a structurally valid deployment configuration", () => {
  const config = loadApiConfig({
    NODE_ENV: "production",
    DATABASE_ADAPTER: "postgres",
    DATABASE_URL: "postgresql://database.internal/mona",
    SESSION_PEPPER: "s".repeat(32),
    RATE_LIMIT_HASH_KEY: "r".repeat(32),
    EMAIL_PROVIDER: "approved-adapter",
    RATE_LIMIT_PROVIDER: "shared-adapter",
    CORS_ALLOWLIST: "https://app.example.test",
    TRUSTED_PROXIES: "10.0.0.1,10.0.0.2",
  });
  assert.equal(config.production, true);
  assert.deepEqual(config.trustedProxies, ["10.0.0.1", "10.0.0.2"]);
});
