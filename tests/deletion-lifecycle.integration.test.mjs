import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import pg from "pg";
import { PostgresStore } from "../server/postgres-store.mjs";
import { MonaService } from "../server/service.mjs";

const execute = promisify(execFile);
const adminUrl = process.env.DB_ADMIN_URL;
test(
  "ordinary schema-owner deletion preserves holds, isolation, and legacy requests",
  { skip: !adminUrl },
  async () => {
    assert.doesNotMatch(adminUrl, /production/i);
    const suffix = `${Date.now()}_${process.pid}`;
    const owner = `deletion_owner_${suffix}`;
    const runtime = `deletion_runtime_${suffix}`;
    const database = `deletion_test_${suffix}`;
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    let verifier;
    let store;
    const connection = (user) => {
      const url = new URL(adminUrl);
      url.username = user;
      url.password = "synthetic_only";
      url.pathname = `/${database}`;
      return url.toString();
    };
    try {
      await admin.query(
        `CREATE ROLE ${owner} LOGIN PASSWORD 'synthetic_only' NOSUPERUSER NOBYPASSRLS`,
      );
      await admin.query(`CREATE DATABASE ${database} OWNER ${owner}`);
      verifier = new pg.Client({
        connectionString: connection(new URL(adminUrl).username),
      });
      // Keep the admin credential from the configured disposable database.
      const verifyUrl = new URL(adminUrl);
      verifyUrl.pathname = `/${database}`;
      verifier = new pg.Client({ connectionString: verifyUrl.toString() });
      await verifier.connect();
      const migrator = new pg.Client({ connectionString: connection(owner) });
      await migrator.connect();
      try {
        await migrator.query(
          "CREATE TABLE schema_migrations(version text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
        );
        const files = (await readdir("db/migrations"))
          .filter((f) => f.endsWith(".sql") && f < "007")
          .sort();
        for (const file of files) {
          const sql = await readFile(`db/migrations/${file}`, "utf8");
          await migrator.query("BEGIN");
          await migrator.query(
            sql.replace(/^BEGIN;\s*/i, "").replace(/\s*COMMIT;\s*$/i, ""),
          );
          await migrator.query(
            "INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",
            [file, createHash("sha256").update(sql).digest("hex")],
          );
          await migrator.query("COMMIT");
        }
      } finally {
        await migrator.end();
      }
      const legacy = (
        await verifier.query(
          "INSERT INTO users(email,password_hash,status) VALUES('legacy@example.test','synthetic','deletion_pending') RETURNING id",
        )
      ).rows[0].id;
      await verifier.query(
        "INSERT INTO deletion_requests(user_id,status,cooling_off_until,legal_hold) VALUES($1,'cooling_off',now()+interval '7 days',false),($1,'legal_hold',now()+interval '9 days',true)",
        [legacy],
      );
      await execute(process.execPath, ["scripts/migrate.mjs"], {
        env: {
          ...process.env,
          DB_ADMIN_URL: connection(owner),
          DATABASE_SSL: "false",
        },
      });
      await execute(process.execPath, ["scripts/migrate.mjs"], {
        env: {
          ...process.env,
          DB_ADMIN_URL: connection(owner),
          DATABASE_SSL: "false",
        },
      });
      const legacyRows = (
        await verifier.query(
          "SELECT status,legal_hold,cooling_off_until>now()+interval '8 days' AS retained_interval FROM deletion_requests WHERE user_id=$1 ORDER BY status",
          [legacy],
        )
      ).rows;
      assert.equal(legacyRows.length, 2);
      assert.equal(
        legacyRows.filter((r) => r.status !== "cancelled").length,
        1,
      );
      assert.equal(
        legacyRows.find((r) => r.status !== "cancelled").legal_hold,
        true,
      );
      assert.equal(
        legacyRows.find((r) => r.status !== "cancelled").retained_interval,
        true,
      );
      await execute(process.execPath, ["scripts/provision-runtime-role.mjs"], {
        env: {
          ...process.env,
          DB_ADMIN_URL: verifyUrl.toString(),
          DB_RUNTIME_USER: runtime,
          DB_RUNTIME_PASSWORD: "synthetic_only",
        },
      });
      store = new PostgresStore(
        new pg.Pool({ connectionString: connection(runtime) }),
      );
      const service = new MonaService(store);
      const active = async (email) => {
        const r = await service.register({
          email,
          password: "correct horse battery staple",
        });
        await service.verifyEmail(r.verificationToken);
        return store.findUserById(r.userId);
      };
      const alice = await active("delete-target@example.test");
      const bob = await active("delete-other@example.test");
      const report = (
        await verifier.query(
          "INSERT INTO reports(reporter_id,subject_user_id,reason) VALUES($1,$2,'synthetic') RETURNING id",
          [alice.id, bob.id],
        )
      ).rows[0];
      await verifier.query(
        "INSERT INTO moderation_actions(report_id,moderator_id,action,rationale) VALUES($1,$2,'review','synthetic')",
        [report.id, bob.id],
      );
      await verifier.query(
        "INSERT INTO mfa_enrollments(user_id,method,secret_ciphertext) VALUES($1,'synthetic',decode('1234','hex'))",
        [alice.id],
      );
      const unrelated = (
        await verifier.query(
          "INSERT INTO conversations DEFAULT VALUES RETURNING id",
        )
      ).rows[0];
      const own = (
        await verifier.query(
          "INSERT INTO conversations DEFAULT VALUES RETURNING id",
        )
      ).rows[0];
      await verifier.query(
        "INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2)",
        [own.id, alice.id],
      );
      const requests = await Promise.all(
        Array.from({ length: 4 }, () => service.deleteAccount(alice)),
      );
      assert.equal(new Set(requests.map((r) => r.id)).size, 1);
      const id = requests[0].id;
      await assert.rejects(store.completeDeletionRequest(id), /failed closed/);
      for (const state of ["cancelled", "legal_hold"]) {
        await verifier.query(
          "UPDATE deletion_requests SET status=$2,cooling_off_until=now() WHERE id=$1",
          [id, state],
        );
        for (let attempt = 0; attempt < 2; attempt++)
          await assert.rejects(
            store.completeDeletionRequest(id),
            /failed closed/,
          );
        assert.equal(
          (
            await verifier.query(
              "SELECT status FROM deletion_requests WHERE id=$1",
              [id],
            )
          ).rows[0].status,
          state,
        );
        assert.equal(
          (await store.findUserById(alice.id)).status,
          "deletion_pending",
        );
      }
      await verifier.query(
        "UPDATE deletion_requests SET status='cooling_off',verified_at=NULL WHERE id=$1",
        [id],
      );
      await assert.rejects(store.completeDeletionRequest(id), /failed closed/);
      await verifier.query(
        "UPDATE deletion_requests SET verified_at=now(),legal_hold=true WHERE id=$1",
        [id],
      );
      await assert.rejects(store.completeDeletionRequest(id), /failed closed/);
      await verifier.query(
        "UPDATE deletion_requests SET legal_hold=false WHERE id=$1",
        [id],
      );
      assert.equal(await store.completeDeletionRequest(id), true);
      assert.equal(await store.completeDeletionRequest(id), true);
      assert.equal((await store.findUserById(alice.id)).status, "deleted");
      assert.equal((await store.findUserById(bob.id)).status, "active");
      assert.equal(
        (
          await verifier.query("SELECT 1 FROM conversations WHERE id=$1", [
            unrelated.id,
          ])
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await verifier.query("SELECT 1 FROM conversations WHERE id=$1", [
            own.id,
          ])
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await verifier.query(
            "SELECT 1 FROM mfa_enrollments WHERE user_id=$1",
            [alice.id],
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (await verifier.query("SELECT report_id FROM moderation_actions"))
          .rows[0].report_id,
        null,
      );
      await store.query("SELECT set_config('app.deletion_mode','on',false)");
      // A runtime caller cannot activate the owner-only policy by copying its flag.
      assert.equal(
        (await store.query("SELECT * FROM deletion_requests")).rowCount,
        0,
      );
      const role = (
        await verifier.query(
          "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1",
          [owner],
        )
      ).rows[0];
      assert.deepEqual(role, { rolsuper: false, rolbypassrls: false });
    } finally {
      if (store) await store.close();
      if (verifier) await verifier.end();
      await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
      await admin.query(`DROP ROLE IF EXISTS ${runtime}`);
      await admin.query(`DROP ROLE IF EXISTS ${owner}`);
      await admin.end();
    }
  },
);
