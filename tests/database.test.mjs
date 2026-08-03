import test from "node:test";
import assert from "node:assert/strict";

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
