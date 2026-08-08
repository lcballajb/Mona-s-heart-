import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";

const url = process.env.TEST_DATABASE_URL;
test(
  "PostgreSQL persistence, isolation, constraints, and rollback",
  { skip: !url },
  async () => {
    if (!url || /production/i.test(url))
      throw new Error("Disposable TEST_DATABASE_URL required");
    process.env.DATABASE_URL = url;
    process.env.NODE_ENV = "test";
    process.env.DATABASE_SSL = "false";
    const { execFileSync } = await import("node:child_process");
    execFileSync(process.execPath, ["scripts/migrate.mjs"], {
      env: process.env,
      stdio: "inherit",
    });
    execFileSync(process.execPath, ["scripts/seed.mjs"], {
      env: process.env,
      stdio: "inherit",
    });
    execFileSync(process.execPath, ["scripts/seed.mjs"], {
      env: process.env,
      stdio: "inherit",
    });
    const [
      { createPool },
      { PostgresStore },
      { MonaService },
      { verifyPassword },
    ] = await Promise.all([
      import("../server/database.mjs"),
      import("../server/postgres-store.mjs"),
      import("../server/service.mjs"),
      import("../server/security.mjs"),
    ]);
    const pool = createPool();
    const store = new PostgresStore(pool);
    const service = new MonaService(store);
    try {
      const suffix = Date.now();
      const registration = await service.register({
        email: `fictional-${suffix}@example.test`,
        password: "correct horse battery staple",
      });
      const persisted = await store.findUserById(registration.userId);
      assert.equal(
        await verifyPassword(
          "correct horse battery staple",
          persisted.passwordHash,
        ),
        true,
      );
      assert.notEqual(persisted.passwordHash, "correct horse battery staple");
      await assert.rejects(
        service.signIn({
          email: persisted.email,
          password: "correct horse battery staple",
        }),
        /unavailable/,
      );
      await service.verifyEmail(registration.verificationToken);
      const recoveryTokens = {
        older: `older-reset-token-${suffix}`,
        newer: `newer-reset-token-${suffix}`,
        otherUser: `separate-user-token-${suffix}`,
        otherPurpose: `separate-purpose-token-${suffix}`,
        concurrentA: `concurrent-token-a-${suffix}`,
        concurrentB: `concurrent-token-b-${suffix}`,
        rollback: `rollback-token-${suffix}`,
      };
      await store.createAccountToken(
        registration.userId,
        "password_reset",
        recoveryTokens.older,
        60_000,
      );
      await store.createAccountToken(
        registration.userId,
        "password_reset",
        recoveryTokens.newer,
        60_000,
      );
      assert.equal(
        await store.consumeAccountToken("password_reset", recoveryTokens.older),
        null,
      );
      assert.equal(
        await store.consumeAccountToken("password_reset", recoveryTokens.newer),
        registration.userId,
      );
      assert.equal(
        await store.consumeAccountToken("password_reset", recoveryTokens.older),
        null,
      );
      const secondRegistration = await service.register({
        email: `token-isolation-${suffix}@example.test`,
        password: "correct horse battery staple",
      });
      await store.createAccountToken(
        registration.userId,
        "email_verification",
        recoveryTokens.otherPurpose,
        60_000,
      );
      await store.createAccountToken(
        secondRegistration.userId,
        "password_reset",
        recoveryTokens.otherUser,
        60_000,
      );
      assert.equal(
        await store.consumeAccountToken(
          "email_verification",
          recoveryTokens.otherPurpose,
        ),
        registration.userId,
      );
      assert.equal(
        await store.consumeAccountToken(
          "password_reset",
          recoveryTokens.otherUser,
        ),
        secondRegistration.userId,
      );
      await Promise.all([
        store.createAccountToken(
          registration.userId,
          "password_reset",
          recoveryTokens.concurrentA,
          60_000,
        ),
        store.createAccountToken(
          registration.userId,
          "password_reset",
          recoveryTokens.concurrentB,
          60_000,
        ),
      ]);
      const activeRecoveryTokens = await store.query(
        "SELECT count(*)::int AS count FROM account_tokens WHERE user_id=$1 AND purpose='password_reset' AND consumed_at IS NULL",
        [registration.userId],
      );
      assert.equal(activeRecoveryTokens.rows[0].count, 1);
      const concurrentResults = await Promise.all([
        store.consumeAccountToken("password_reset", recoveryTokens.concurrentA),
        store.consumeAccountToken("password_reset", recoveryTokens.concurrentB),
      ]);
      assert.deepEqual(concurrentResults.filter(Boolean), [
        registration.userId,
      ]);
      await store.createAccountToken(
        registration.userId,
        "password_reset",
        recoveryTokens.rollback,
        60_000,
      );
      await assert.rejects(
        store.completeAccountToken(
          "password_reset",
          recoveryTokens.rollback,
          async () => {
            throw new Error("credential operation failed");
          },
        ),
        /credential operation failed/,
      );
      assert.equal(
        await store.consumeAccountToken(
          "password_reset",
          recoveryTokens.rollback,
        ),
        registration.userId,
      );
      const login = await service.signIn({
        email: persisted.email,
        password: "correct horse battery staple",
      });
      assert.ok(await store.session(login.token));
      await service.signOut(login.token);
      assert.equal(await store.session(login.token), null);
      const actor = await store.findUserById(registration.userId);
      await service.recordConsent(actor, "health_data_processing", "2026-01");
      await service.withdrawConsent(actor, "health_data_processing", "2026-01");
      const consents = await store.query(
        "SELECT granted FROM consent_records WHERE user_id=$1 ORDER BY granted_at",
        [actor.id],
      );
      assert.deepEqual(
        consents.rows.map((r) => r.granted),
        [true, false],
      );
      await service.exportData(actor);
      await service.deleteAccount(actor);
      const jobs = await store.query(
        "SELECT kind FROM background_jobs WHERE payload_reference IN (SELECT id FROM export_requests WHERE user_id=$1 UNION SELECT id FROM deletion_requests WHERE user_id=$1)",
        [actor.id],
      );
      assert.deepEqual(
        new Set(jobs.rows.map((r) => r.kind)),
        new Set(["data_export", "account_deletion"]),
      );
      await assert.rejects(
        store.transaction(async (tx) => {
          await tx.query(
            "INSERT INTO organizations(name,kind) VALUES($1,'clinic')",
            [`Rollback ${suffix}`],
          );
          throw new Error("rollback");
        }),
        /rollback/,
      );
      const rolled = await store.query(
        "SELECT 1 FROM organizations WHERE name=$1",
        [`Rollback ${suffix}`],
      );
      assert.equal(rolled.rowCount, 0);
      await assert.rejects(
        store.createUser({
          email: persisted.email,
          passwordHash: "not-plaintext",
          roles: ["patient"],
        }),
      );
      await assert.rejects(
        store.query(
          "INSERT INTO sessions(user_id,token_digest,csrf_digest,expires_at) VALUES(gen_random_uuid(),decode('00','hex'),decode('01','hex'),now())",
        ),
      );
      const audits = await store.query(
        "SELECT event_type FROM audit_events WHERE subject_id=$1",
        [actor.id],
      );
      assert.ok(audits.rowCount >= 5);

      const forcedRls = await store.query(
        `SELECT relname, relrowsecurity, relforcerowsecurity
           FROM pg_class
          WHERE relname = ANY($1::text[])
          ORDER BY relname`,
        [
          [
            "conversations",
            "documents",
            "health_entries",
            "imported_records",
            "messages",
            "profiles",
          ],
        ],
      );
      assert.deepEqual(
        forcedRls.rows.map((row) => ({
          table: row.relname,
          enabled: row.relrowsecurity,
          forced: row.relforcerowsecurity,
        })),
        [
          { table: "conversations", enabled: true, forced: true },
          { table: "documents", enabled: true, forced: true },
          { table: "health_entries", enabled: true, forced: true },
          { table: "imported_records", enabled: true, forced: true },
          { table: "messages", enabled: true, forced: true },
          { table: "profiles", enabled: true, forced: true },
        ],
      );
    } finally {
      await store.close();
    }
  },
);
