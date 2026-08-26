import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";

const url = process.env.TEST_DATABASE_URL;
const adminUrl = process.env.DB_ADMIN_URL;
if (
  (!url || !adminUrl) &&
  process.env.REQUIRE_POSTGRES_SECURITY_TEST === "true"
)
  throw new Error(
    "TEST_DATABASE_URL and DB_ADMIN_URL are required; the mandatory PostgreSQL security suite cannot be skipped",
  );
test(
  "PostgreSQL persistence, isolation, constraints, and rollback",
  { skip: !url },
  async () => {
    if (!url || !adminUrl || /production/i.test(url))
      throw new Error("Disposable TEST_DATABASE_URL required");
    process.env.DATABASE_URL = url;
    process.env.NODE_ENV = "test";
    process.env.DATABASE_SSL = "false";
    const [
      { attestRuntimeRole, createPool },
      { PostgresStore },
      { createStore },
      { MonaService },
      { verifyPassword },
      { Client },
    ] = await Promise.all([
      import("../server/database.mjs"),
      import("../server/postgres-store.mjs"),
      import("../server/store-factory.mjs"),
      import("../server/service.mjs"),
      import("../server/security.mjs"),
      import("pg"),
    ]);
    const pool = createPool();
    const store = new PostgresStore(pool);
    const service = new MonaService(store);
    const admin = new Client({ connectionString: adminUrl, ssl: false });
    await admin.connect();
    try {
      const startupStore = await createStore({
        ...process.env,
        DATABASE_URL: url,
        DB_RUNTIME_USER: process.env.DB_RUNTIME_USER,
      });
      await startupStore.close();
      await assert.rejects(
        createStore({
          ...process.env,
          DATABASE_URL: adminUrl,
          DB_RUNTIME_USER: process.env.DB_RUNTIME_USER,
        }),
        /PostgreSQL readiness check failed/,
      );
      await attestRuntimeRole(pool, {
        expectedRole: process.env.DB_RUNTIME_USER,
      });
      await assert.rejects(
        attestRuntimeRole(pool, { expectedRole: "unexpected_runtime" }),
        /runtime role attestation failed/,
      );

      const unsafePassword = "unsafe_test_password";
      const securitySuffix = Date.now();
      const roleNames = {
        bypass: `mona_test_bypass_${securitySuffix}`,
        privileged: `mona_test_admin_${securitySuffix}`,
        replication: `mona_test_replication_${securitySuffix}`,
        schemaCreator: `mona_test_schema_${securitySuffix}`,
        tableOwner: `mona_test_owner_${securitySuffix}`,
      };
      const unsafeRoles = [
        [roleNames.bypass, "BYPASSRLS"],
        [roleNames.privileged, "CREATEDB CREATEROLE"],
        [roleNames.replication, "REPLICATION"],
        [roleNames.schemaCreator, ""],
        [roleNames.tableOwner, ""],
      ];
      const databaseName = (
        await admin.query("SELECT current_database() AS name")
      ).rows[0].name;
      const quotedDatabaseName = `"${databaseName.replaceAll('"', '""')}"`;
      const roleUrl = (role) => {
        const parsed = new URL(url);
        parsed.username = role;
        parsed.password = unsafePassword;
        return parsed.toString();
      };
      const attestUnsafeRole = async (role) => {
        const unsafePool = createPool({
          ...process.env,
          DATABASE_URL: roleUrl(role),
        });
        try {
          await assert.rejects(
            attestRuntimeRole(unsafePool, { expectedRole: role }),
            /^Error: PostgreSQL runtime role attestation failed$/,
          );
        } finally {
          await unsafePool.end();
        }
      };

      for (const [role, attributes] of unsafeRoles) {
        await admin.query(`DROP ROLE IF EXISTS ${role}`);
        await admin.query(
          `CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${unsafePassword}'`,
        );
        if (attributes)
          await admin.query(`ALTER ROLE ${role} WITH ${attributes}`);
        await admin.query(
          `GRANT CONNECT ON DATABASE ${quotedDatabaseName} TO ${role}`,
        );
        await admin.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
      }

      const adminPool = createPool({
        ...process.env,
        DATABASE_URL: adminUrl,
      });
      try {
        await assert.rejects(
          attestRuntimeRole(adminPool, { expectedRole: "mona_admin" }),
          /runtime role attestation failed/,
        );
      } finally {
        await adminPool.end();
      }
      await attestUnsafeRole(roleNames.bypass);
      await attestUnsafeRole(roleNames.privileged);
      await attestUnsafeRole(roleNames.replication);

      await admin.query(`GRANT ${roleNames.bypass} TO ${roleNames.tableOwner}`);
      await attestUnsafeRole(roleNames.tableOwner);
      await admin.query(
        `REVOKE ${roleNames.bypass} FROM ${roleNames.tableOwner}`,
      );

      await admin.query(
        `GRANT CREATE ON DATABASE ${quotedDatabaseName} TO ${roleNames.schemaCreator}`,
      );
      await attestUnsafeRole(roleNames.schemaCreator);
      await admin.query(
        `REVOKE CREATE ON DATABASE ${quotedDatabaseName} FROM ${roleNames.schemaCreator}`,
      );

      await admin.query(
        `GRANT CREATE ON SCHEMA public TO ${roleNames.schemaCreator}`,
      );
      await attestUnsafeRole(roleNames.schemaCreator);
      await admin.query(
        `REVOKE CREATE ON SCHEMA public FROM ${roleNames.schemaCreator}`,
      );

      await admin.query(
        `GRANT TRUNCATE ON notifications TO ${roleNames.schemaCreator}`,
      );
      await attestUnsafeRole(roleNames.schemaCreator);
      await admin.query(
        `REVOKE TRUNCATE ON notifications FROM ${roleNames.schemaCreator}`,
      );

      await admin.query(
        `ALTER TABLE profiles OWNER TO ${roleNames.tableOwner}`,
      );
      await attestUnsafeRole(roleNames.tableOwner);
      await admin.query("ALTER TABLE profiles OWNER TO mona_admin");

      await admin.query(
        "ALTER TABLE organization_memberships DISABLE ROW LEVEL SECURITY",
      );
      await assert.rejects(
        attestRuntimeRole(pool, { expectedRole: process.env.DB_RUNTIME_USER }),
        /runtime role attestation failed/,
      );
      await admin.query(
        "ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY",
      );
      await admin.query(
        "ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY",
      );

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
      const otherActor = await store.findUserById(secondRegistration.userId);

      const identity = await store.query(
        `SELECT current_user, session_user,
                rolsuper, rolcreatedb, rolcreaterole, rolinherit,
                rolreplication, rolbypassrls
           FROM pg_roles WHERE rolname = current_user`,
      );
      assert.equal(identity.rows[0].current_user, process.env.DB_RUNTIME_USER);
      assert.equal(identity.rows[0].session_user, process.env.DB_RUNTIME_USER);
      for (const attribute of [
        "rolsuper",
        "rolcreatedb",
        "rolcreaterole",
        "rolinherit",
        "rolreplication",
        "rolbypassrls",
      ])
        assert.equal(identity.rows[0][attribute], false, attribute);
      const adminIdentity = await admin.query(
        "SELECT current_user, session_user",
      );
      assert.notEqual(
        adminIdentity.rows[0].current_user,
        identity.rows[0].current_user,
      );
      assert.notEqual(
        adminIdentity.rows[0].session_user,
        identity.rows[0].session_user,
      );
      const ownership = await admin.query(
        `SELECT
           count(*) FILTER (WHERE c.relowner = r.oid)::int AS owned_tables,
           (SELECT n.nspowner = r.oid FROM pg_namespace n WHERE n.nspname='public') AS owns_schema
         FROM pg_roles r
         LEFT JOIN pg_class c ON c.relnamespace = 'public'::regnamespace
                              AND c.relkind IN ('r','p')
        WHERE r.rolname=$1
        GROUP BY r.oid`,
        [process.env.DB_RUNTIME_USER],
      );
      assert.equal(ownership.rows[0].owned_tables, 0);
      assert.equal(ownership.rows[0].owns_schema, false);
      await assert.rejects(
        store.query(`CREATE TABLE runtime_ddl_denied(id int)`),
      );

      const inActorContext = (userId, sql, values = []) =>
        store.transaction((tx) => tx.query(sql, values), { userId });
      const consentInput = {
        purpose: "health_data_processing",
        version: "2026-01",
        granted: true,
        withdrawnAt: null,
        sourceInterface: "web",
        region: "unspecified",
        language: "en",
        organizationId: null,
      };
      await service.recordConsent(actor, "health_data_processing", "2026-01");
      await service.withdrawConsent(actor, "health_data_processing", "2026-01");
      const consents = await inActorContext(
        actor.id,
        "SELECT granted FROM consent_records WHERE user_id=$1 ORDER BY granted_at",
        [actor.id],
      );
      assert.deepEqual(
        consents.rows.map((r) => r.granted),
        [true, false],
      );
      await assert.rejects(
        inActorContext(
          actor.id,
          `INSERT INTO consent_records(user_id,purpose,policy_version,granted,granted_at,capture_method,region,language)
           VALUES($1,$2,$3,true,now(),'web','unspecified','en')`,
          [otherActor.id, consentInput.purpose, consentInput.version],
        ),
      );
      await assert.rejects(
        store.query(
          `INSERT INTO consent_records(user_id,purpose,policy_version,granted,granted_at,capture_method,region,language)
           VALUES($1,$2,$3,true,now(),'web','unspecified','en')`,
          [actor.id, consentInput.purpose, consentInput.version],
        ),
      );

      await service.createNotification(actor, "security_test", {
        valid: true,
      });
      assert.equal(
        (
          await inActorContext(
            actor.id,
            "SELECT * FROM notifications WHERE user_id=$1",
            [actor.id],
          )
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await inActorContext(
            otherActor.id,
            "SELECT * FROM notifications WHERE user_id=$1",
            [actor.id],
          )
        ).rowCount,
        0,
      );
      await assert.rejects(
        inActorContext(
          otherActor.id,
          "INSERT INTO notifications(user_id,kind) VALUES($1,'cross_user')",
          [actor.id],
        ),
      );
      await assert.rejects(
        store.query(
          "INSERT INTO notifications(user_id,kind) VALUES($1,'missing')",
          [actor.id],
        ),
      );

      const exportRequest = await service.exportData(actor);
      assert.equal(
        (
          await inActorContext(
            actor.id,
            "SELECT * FROM export_requests WHERE id=$1",
            [exportRequest.id],
          )
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await inActorContext(
            otherActor.id,
            "SELECT * FROM export_requests WHERE id=$1",
            [exportRequest.id],
          )
        ).rowCount,
        0,
      );
      await assert.rejects(
        inActorContext(
          otherActor.id,
          "INSERT INTO export_requests(user_id,expires_at) VALUES($1,now()+interval '1 day')",
          [actor.id],
        ),
      );
      await assert.rejects(
        store.query(
          "INSERT INTO export_requests(user_id,expires_at) VALUES($1,now()+interval '1 day')",
          [actor.id],
        ),
      );

      const documents = await admin.query(
        `INSERT INTO documents(owner_id,object_id,encrypted_object_key,encrypted_data_key,mime_type,size_bytes)
         VALUES ($1,$2,$3,decode('01','hex'),'application/octet-stream',1),
                ($4,$5,$6,decode('02','hex'),'application/octet-stream',1),
                ($1,$7,$8,decode('03','hex'),'application/octet-stream',1)
         RETURNING id, owner_id`,
        [
          actor.id,
          `owned-${suffix}`,
          `owned-key-${suffix}`,
          otherActor.id,
          `other-${suffix}`,
          `other-key-${suffix}`,
          `deleted-${suffix}`,
          `deleted-key-${suffix}`,
        ],
      );
      const ownDocument = documents.rows[0];
      const otherDocument = documents.rows[1];
      const deletedDocument = documents.rows[2];
      await admin.query("UPDATE documents SET deleted_at=now() WHERE id=$1", [
        deletedDocument.id,
      ]);
      const importsBefore = await admin.query(
        "SELECT count(*)::int AS count FROM imported_records",
      );
      await store.createImportedRecordMetadata(actor.id, {
        documentId: ownDocument.id,
        source: "security-test",
        payloadCiphertext: Buffer.from("valid"),
      });
      for (const documentId of [
        otherDocument.id,
        deletedDocument.id,
        registration.userId,
      ])
        await assert.rejects(
          store.createImportedRecordMetadata(actor.id, {
            documentId,
            source: "security-test",
            payloadCiphertext: Buffer.from("denied"),
          }),
          /Document unavailable/,
        );
      await assert.rejects(
        inActorContext(
          otherActor.id,
          `INSERT INTO imported_records(user_id,document_id,source,payload_ciphertext)
           VALUES($1,$2,'spoofed',decode('04','hex'))`,
          [actor.id, ownDocument.id],
        ),
      );
      const importsAfter = await admin.query(
        "SELECT count(*)::int AS count FROM imported_records",
      );
      assert.equal(importsAfter.rows[0].count, importsBefore.rows[0].count + 1);

      const deletionRequest = await service.deleteAccount(actor);
      assert.equal(
        (
          await inActorContext(
            actor.id,
            "SELECT * FROM deletion_requests WHERE id=$1",
            [deletionRequest.id],
          )
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await inActorContext(
            otherActor.id,
            "SELECT * FROM deletion_requests WHERE id=$1",
            [deletionRequest.id],
          )
        ).rowCount,
        0,
      );
      await assert.rejects(
        inActorContext(
          otherActor.id,
          "INSERT INTO deletion_requests(user_id,cooling_off_until) VALUES($1,now()+interval '7 days')",
          [actor.id],
        ),
      );
      await assert.rejects(
        store.query(
          "INSERT INTO deletion_requests(user_id,cooling_off_until) VALUES($1,now()+interval '7 days')",
          [actor.id],
        ),
      );
      const jobs = await store.query(
        "SELECT kind FROM background_jobs WHERE payload_reference = ANY($1::uuid[])",
        [[exportRequest.id, deletionRequest.id]],
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

      await assert.rejects(
        store.transaction(
          async (tx) => {
            await tx.query("SET LOCAL row_security=off");
            await tx.query("SELECT * FROM consent_records WHERE user_id=$1", [
              otherActor.id,
            ]);
          },
          { userId: actor.id },
        ),
      );

      const forcedRls = await store.query(
        `SELECT relname, relrowsecurity, relforcerowsecurity
           FROM pg_class
          WHERE relname = ANY($1::text[])
          ORDER BY relname`,
        [
          [
            "conversations",
            "consent_records",
            "deletion_requests",
            "documents",
            "export_requests",
            "health_entries",
            "imported_records",
            "messages",
            "notifications",
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
          { table: "consent_records", enabled: true, forced: true },
          { table: "conversations", enabled: true, forced: true },
          { table: "deletion_requests", enabled: true, forced: true },
          { table: "documents", enabled: true, forced: true },
          { table: "export_requests", enabled: true, forced: true },
          { table: "health_entries", enabled: true, forced: true },
          { table: "imported_records", enabled: true, forced: true },
          { table: "messages", enabled: true, forced: true },
          { table: "notifications", enabled: true, forced: true },
          { table: "profiles", enabled: true, forced: true },
        ],
      );

      const duplicateDeletion = await service.deleteAccount(actor);
      assert.equal(duplicateDeletion.id, deletionRequest.id);
      assert.equal(
        await store.completeDeletionRequest(deletionRequest.id),
        true,
      );
      assert.equal(
        await store.completeDeletionRequest(deletionRequest.id),
        true,
      );
      const deletedUser = await admin.query(
        "SELECT status,deleted_at,email FROM users WHERE id=$1",
        [actor.id],
      );
      assert.equal(deletedUser.rows[0].status, "deleted");
      assert.ok(deletedUser.rows[0].deleted_at);
      assert.match(deletedUser.rows[0].email, /^deleted\+/);
      for (const [table, column] of [
        ["profiles", "user_id"],
        ["health_entries", "user_id"],
        ["documents", "owner_id"],
        ["imported_records", "user_id"],
        ["notifications", "user_id"],
        ["export_requests", "user_id"],
        ["organization_memberships", "user_id"],
        ["account_tokens", "user_id"],
      ]) {
        const remaining = await admin.query(
          `SELECT count(*)::int AS count FROM ${table} WHERE ${column}=$1`,
          [actor.id],
        );
        assert.equal(remaining.rows[0].count, 0, table);
      }
      const lifecycleAudit = await admin.query(
        "SELECT event_type FROM audit_events WHERE subject_id=$1 AND event_type LIKE 'deletion_%' ORDER BY occurred_at",
        [actor.id],
      );
      assert.deepEqual(
        lifecycleAudit.rows.map((row) => row.event_type),
        ["deletion_request", "deletion_started", "deletion_completed"],
      );

      const workerPrivileges = await store.query(
        `SELECT has_function_privilege(current_user,'complete_account_deletion(uuid)','EXECUTE') AS can_execute,
                has_table_privilege(current_user,'profiles','DELETE') AS can_delete_profiles`,
      );
      assert.deepEqual(workerPrivileges.rows[0], {
        can_execute: true,
        can_delete_profiles: false,
      });

      const retryRegistration = await service.register({
        email: `deletion-retry-${suffix}@example.test`,
        password: "correct horse battery staple",
      });
      await service.verifyEmail(retryRegistration.verificationToken);
      const retryActor = await store.findUserById(retryRegistration.userId);
      await admin.query(
        "INSERT INTO profiles(user_id,display_name) VALUES($1,'Retry safely')",
        [retryActor.id],
      );
      const retryRequest = await service.deleteAccount(retryActor);
      await admin.query(
        `CREATE FUNCTION fail_deletion_test() RETURNS trigger LANGUAGE plpgsql AS
         $$ BEGIN RAISE EXCEPTION 'forced partial failure'; END $$`,
      );
      await admin.query(
        "CREATE TRIGGER fail_deletion_test BEFORE DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION fail_deletion_test()",
      );
      await assert.rejects(
        store.completeDeletionRequest(retryRequest.id),
        /failed closed/,
      );
      const failedClosed = await admin.query(
        `SELECT d.status,u.status AS user_status,
                EXISTS(SELECT 1 FROM profiles p WHERE p.user_id=u.id) AS profile_exists
           FROM deletion_requests d JOIN users u ON u.id=d.user_id WHERE d.id=$1`,
        [retryRequest.id],
      );
      assert.deepEqual(failedClosed.rows[0], {
        status: "failed",
        user_status: "deletion_pending",
        profile_exists: true,
      });
      await admin.query("DROP TRIGGER fail_deletion_test ON profiles");
      await admin.query("DROP FUNCTION fail_deletion_test() ");
      assert.equal(await store.completeDeletionRequest(retryRequest.id), true);
    } finally {
      await admin.end();
      await store.close();
    }
  },
);
