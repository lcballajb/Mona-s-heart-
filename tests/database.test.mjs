import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../server/store.mjs";

let database;
let postgresStore;
try {
  [database, postgresStore] = await Promise.all([
    import("../server/database.mjs"),
    import("../server/postgres-store.mjs"),
  ]);
} catch (error) {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

test(
  "production database configuration requires verified TLS",
  { skip: !database },
  () => {
    const { poolConfig } = database;
    const production = {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://example.test/mona",
    };

    assert.throws(() => poolConfig(production), /requires DATABASE_SSL=true/);
    assert.throws(
      () => poolConfig({ ...production, DATABASE_SSL: "false" }),
      /requires DATABASE_SSL=true/,
    );
    assert.throws(
      () =>
        poolConfig({
          ...production,
          DATABASE_SSL: "true",
          DATABASE_SSL_REJECT_UNAUTHORIZED: "false",
        }),
      /certificate verification/,
    );
    assert.deepEqual(poolConfig({ ...production, DATABASE_SSL: "true" }).ssl, {
      rejectUnauthorized: true,
    });
    assert.equal(
      poolConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://localhost/mona",
        DATABASE_SSL: "false",
      }).ssl,
      false,
    );
  },
);

test("MemoryStore singular lookups return objects or null", () => {
  let now = new Date("2026-01-01T00:00:00Z");
  const store = new MemoryStore(() => now);

  assert.equal(store.findUserById("missing"), null);
  assert.equal(store.findUserByEmail("missing@example.test"), null);
  assert.equal(store.consumeAccountToken("verify_email", "missing"), null);
  assert.equal(store.session("missing"), null);

  const user = store.createUser({
    email: "contract@example.test",
    passwordHash: "not-plaintext",
  });
  assert.equal(store.findUserById(user.id), user);
  assert.equal(store.findUserByEmail(user.email), user);

  const active = store.createSession(user.id, "active", 1_000);
  assert.equal(store.session("active"), active);
  store.revokeSession("active");
  assert.equal(store.session("active"), null);

  store.createSession(user.id, "expired", 1_000);
  now = new Date("2026-01-01T00:00:02Z");
  assert.equal(store.session("expired"), null);
});

test(
  "PostgresStore singular lookups return normalized objects or null",
  { skip: !postgresStore },
  async () => {
    const { PostgresStore } = postgresStore;
    const rawSession = {
      id: "00000000-0000-4000-8000-000000000003",
      user_id: "00000000-0000-4000-8000-000000000004",
      expires_at: new Date("2026-01-01T00:30:00Z"),
      revoked_at: null,
    };
    let sessionRows = [];
    const pool = {
      async query(text) {
        if (text.startsWith("SELECT * FROM sessions"))
          return { rows: sessionRows };
        return { rows: [] };
      },
    };
    const store = new PostgresStore(pool);

    assert.equal(await store.findUserById("missing"), null);
    assert.equal(await store.findUserByEmail("missing@example.test"), null);
    assert.equal(
      await store.consumeAccountToken("verify_email", "missing"),
      null,
    );
    assert.equal(await store.session("missing"), null);

    sessionRows = [rawSession];
    assert.deepEqual(await store.session("active"), {
      id: rawSession.id,
      userId: rawSession.user_id,
      digest:
        "96879611650f80a81392a52e0db9b0237669087c4518e1c130e541a505e0eeef",
      csrfToken: null,
      expiresAt: "2026-01-01T00:30:00.000Z",
      revokedAt: null,
    });

    sessionRows = [];
    assert.equal(await store.session("revoked-or-expired"), null);
  },
);

test(
  "membership operations set organization RLS context in a transaction",
  { skip: !postgresStore },
  async () => {
    const { PostgresStore } = postgresStore;
    const organizationId = "00000000-0000-4000-8000-000000000001";
    const userId = "00000000-0000-4000-8000-000000000002";
    const calls = [];
    const client = {
      async query(text, values = []) {
        calls.push({ text, values });
        if (text.startsWith("SELECT 1 FROM organization_memberships"))
          return { rows: [{ "?column?": 1 }] };
        if (text.startsWith("INSERT INTO organization_memberships"))
          return {
            rows: [{ organization_id: organizationId, user_id: userId }],
          };
        return { rows: [] };
      },
      release() {},
    };
    const pool = {
      async connect() {
        return client;
      },
    };
    const store = new PostgresStore(pool);

    assert.equal(await store.hasMembership(userId, organizationId), true);
    await store.addOrganizationMembership({
      organizationId,
      userId,
      roleCode: "member",
      status: "active",
    });

    assert.equal(calls.filter(({ text }) => text === "BEGIN").length, 2);
    assert.deepEqual(
      calls
        .filter(({ text }) =>
          text.includes("set_config('app.organization_ids'"),
        )
        .map(({ values }) => values),
      [[organizationId], [organizationId]],
    );
    assert.equal(calls.filter(({ text }) => text === "COMMIT").length, 2);
  },
);
