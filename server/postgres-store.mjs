import { randomUUID } from "node:crypto";
import { tokenDigest } from "./security.mjs";
import { databaseMetrics, timedQuery } from "./database.mjs";

const iso = (value) => (value ? new Date(value).toISOString() : null);
const mapUser = (r) =>
  r
    ? {
        id: r.id,
        email: r.email,
        passwordHash: r.password_hash,
        passwordAlgorithm: r.password_algorithm,
        roles: r.roles ?? [],
        status: r.status,
        verifiedAt: iso(r.email_verified_at),
        failedAttempts: r.failed_attempts,
        lockedUntil: iso(r.locked_until),
        createdAt: iso(r.created_at),
      }
    : null;

export class PostgresStore {
  constructor(pool, clock = () => new Date(), { sessionPepper = "" } = {}) {
    this.pool = pool;
    this.clock = clock;
    this.sessionPepper = sessionPepper;
  }
  now() {
    return this.clock().toISOString();
  }
  async query(text, values = [], client = this.pool) {
    return timedQuery(client, text, values);
  }
  async close() {
    await this.pool.end();
  }
  async ready() {
    await this.query("SELECT 1");
    return true;
  }
  metrics() {
    return {
      ...databaseMetrics,
      poolTotal: this.pool.totalCount,
      poolIdle: this.pool.idleCount,
      poolWaiting: this.pool.waitingCount,
    };
  }
  async transaction(work, context = {}) {
    const started = performance.now();
    const client = await this.pool.connect();
    databaseMetrics.connectionWaitMs += performance.now() - started;
    try {
      await client.query("BEGIN");
      if (context.userId)
        await client.query("SELECT set_config('app.user_id', $1, true)", [
          context.userId,
        ]);
      if (context.organizationIds)
        await client.query(
          "SELECT set_config('app.organization_ids', $1, true)",
          [context.organizationIds.join(",")],
        );
      const value = await work(
        new PostgresStore(client, this.clock, {
          sessionPepper: this.sessionPepper,
        }),
      );
      await client.query("COMMIT");
      return value;
    } catch (error) {
      databaseMetrics.rollbacks++;
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async createUser(input) {
    const id = randomUUID();
    const { rows } = await this.query(
      `INSERT INTO users(id,email,password_hash,password_algorithm) VALUES($1,lower($2),$3,$4)
       RETURNING *, $5::text[] AS roles`,
      [
        id,
        input.email,
        input.passwordHash,
        input.passwordAlgorithm ?? "scrypt-v1",
        input.roles ?? ["patient"],
      ],
    );
    for (const role of input.roles ?? ["patient"])
      await this.query(
        "INSERT INTO user_roles(user_id,role_code) VALUES($1,$2)",
        [id, role],
      );
    return mapUser(rows[0]);
  }
  async findUserByEmail(email) {
    const { rows } = await this.query(
      `SELECT u.*, coalesce(array_agg(ur.role_code) FILTER (WHERE ur.role_code IS NOT NULL),'{}') roles FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id WHERE lower(u.email)=lower($1) AND u.deleted_at IS NULL GROUP BY u.id`,
      [email],
    );
    return mapUser(rows[0]);
  }
  async findUserById(id) {
    const { rows } = await this.query(
      `SELECT u.*, coalesce(array_agg(ur.role_code) FILTER (WHERE ur.role_code IS NOT NULL),'{}') roles FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id WHERE u.id=$1 GROUP BY u.id`,
      [id],
    );
    return mapUser(rows[0]);
  }
  async createAccountToken(userId, purpose, rawToken, ttlMs) {
    await this.query(
      "INSERT INTO account_tokens(user_id,purpose,token_digest,expires_at) VALUES($1,$2,decode($3,'hex'),$4)",
      [
        userId,
        purpose,
        tokenDigest(rawToken),
        new Date(this.clock().getTime() + ttlMs),
      ],
    );
  }
  async consumeAccountToken(purpose, rawToken) {
    const { rows } = await this.query(
      `UPDATE account_tokens SET consumed_at=now() WHERE id=(SELECT id FROM account_tokens WHERE purpose=$1 AND token_digest=decode($2,'hex') AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE) RETURNING user_id`,
      [purpose, tokenDigest(rawToken)],
    );
    return rows[0]?.user_id ?? null;
  }
  async verifyUser(userId) {
    const { rows } = await this.query(
      "UPDATE users SET email_verified_at=now(),status='active' WHERE id=$1 RETURNING *",
      [userId],
    );
    return mapUser(rows[0]);
  }
  async recordLoginFailure(userId) {
    await this.query(
      "UPDATE users SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",
      [userId],
    );
  }
  async clearLoginFailures(userId) {
    await this.query(
      "UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=$1",
      [userId],
    );
  }
  async createSession(userId, rawToken, ttlMs) {
    const csrfToken = randomUUID();
    const { rows } = await this.query(
      `INSERT INTO sessions(user_id,token_digest,csrf_digest,expires_at) VALUES($1,decode($2,'hex'),decode($3,'hex'),$4) RETURNING *`,
      [
        userId,
        tokenDigest(rawToken, this.sessionPepper),
        tokenDigest(csrfToken),
        new Date(this.clock().getTime() + ttlMs),
      ],
    );
    return {
      id: rows[0].id,
      userId,
      digest: tokenDigest(rawToken, this.sessionPepper),
      csrfToken,
      expiresAt: iso(rows[0].expires_at),
      revokedAt: null,
    };
  }
  async updatePassword(id, passwordHash) {
    const { rows } = await this.query(
      "UPDATE users SET password_hash=$2,password_algorithm='scrypt-v1',updated_at=now() WHERE id=$1 RETURNING *, ARRAY(SELECT role_code FROM user_roles WHERE user_id=$1) AS roles",
      [id, passwordHash],
    );
    return mapUser(rows[0]);
  }
  async session(rawToken) {
    const { rows } = await this.query(
      "SELECT * FROM sessions WHERE token_digest=decode($1,'hex') AND revoked_at IS NULL AND expires_at>now()",
      [tokenDigest(rawToken ?? "", this.sessionPepper)],
    );
    const r = rows[0];
    return r
      ? {
          id: r.id,
          userId: r.user_id,
          digest: tokenDigest(rawToken, this.sessionPepper),
          csrfToken: null,
          expiresAt: iso(r.expires_at),
          revokedAt: iso(r.revoked_at),
        }
      : null;
  }
  async validateCsrf(session, rawToken) {
    const { rows } = await this.query(
      "SELECT 1 FROM sessions WHERE id=$1 AND csrf_digest=decode($2,'hex')",
      [session.id, tokenDigest(rawToken ?? "")],
    );
    return Boolean(rows[0]);
  }
  async revokeSession(rawToken) {
    await this.query(
      "UPDATE sessions SET revoked_at=now() WHERE token_digest=decode($1,'hex')",
      [tokenDigest(rawToken ?? "", this.sessionPepper)],
    );
  }
  async revokeUserSessions(userId) {
    await this.query(
      "UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [userId],
    );
  }
  async listSessions(userId) {
    const { rows } = await this.query(
      "SELECT id,user_id,created_at,expires_at,revoked_at FROM sessions WHERE user_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC",
      [userId],
    );
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      createdAt: iso(row.created_at),
      expiresAt: iso(row.expires_at),
      revokedAt: iso(row.revoked_at),
    }));
  }
  async revokeSessionById(userId, sessionId) {
    const { rowCount } = await this.query(
      "UPDATE sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL",
      [sessionId, userId],
    );
    return rowCount === 1;
  }
  async audit(type, actorId, subjectId, metadata = {}) {
    const { rows } = await this.query(
      "INSERT INTO audit_events(event_type,actor_id,subject_id,action_result,request_id,metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        type,
        actorId,
        subjectId,
        metadata.result ?? "success",
        metadata.requestId ?? randomUUID(),
        metadata,
      ],
    );
    return rows[0];
  }
  async recordConsent(input) {
    const { rows } = await this.query(
      `INSERT INTO consent_records(user_id,purpose,policy_version,granted,granted_at,withdrawn_at,capture_method,region,language,organization_id) VALUES($1,$2,$3,$4,now(),$5,$6,$7,$8,$9) RETURNING *`,
      [
        input.userId,
        input.purpose,
        input.version,
        input.granted,
        input.withdrawnAt,
        input.sourceInterface,
        input.region,
        input.language,
        input.organizationId,
      ],
    );
    return rows[0];
  }
  async createJob(kind, payloadReference, scheduledAt = this.now()) {
    const { rows } = await this.query(
      "INSERT INTO background_jobs(kind,payload_reference,scheduled_at,idempotency_key) VALUES($1,$2,$3,$4) ON CONFLICT(idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET idempotency_key=excluded.idempotency_key RETURNING *",
      [kind, payloadReference, scheduledAt, `${kind}:${payloadReference}`],
    );
    return rows[0];
  }
  async claimJobs({ limit = 1, leaseMs = 60_000 } = {}) {
    const { rows } = await this.query(
      `WITH candidates AS (SELECT id FROM background_jobs
       WHERE dead_lettered=false AND completed_at IS NULL AND scheduled_at<=now()
       AND (status='queued' OR (status='running' AND locked_at < now()-($2::int * interval '1 millisecond')))
       ORDER BY scheduled_at FOR UPDATE SKIP LOCKED LIMIT $1)
       UPDATE background_jobs j SET status='running',locked_at=now(),attempts=attempts+1
       FROM candidates c WHERE j.id=c.id RETURNING j.*`,
      [Math.min(limit, 20), leaseMs],
    );
    return rows.map((row) => ({
      ...row,
      payloadReference: row.payload_reference,
      correlationId: row.correlation_id,
      idempotencyKey: row.idempotency_key,
    }));
  }
  async completeJob(id) {
    const { rows } = await this.query(
      "UPDATE background_jobs SET status='completed',completed_at=now(),failure_reason=NULL WHERE id=$1 RETURNING *",
      [id],
    );
    return rows[0];
  }
  async failJob(id, reason, { maxAttempts = 5, backoffMs = 1000 } = {}) {
    const { rows } = await this.query(
      `UPDATE background_jobs SET failure_reason=left($2,500),locked_at=NULL,
       status=CASE WHEN attempts >= $3 THEN 'failed' ELSE 'queued' END,
       dead_lettered=(attempts >= $3),
       scheduled_at=CASE WHEN attempts >= $3 THEN scheduled_at ELSE now()+(($4 * power(2, greatest(attempts-1,0)))::int * interval '1 millisecond') END
       WHERE id=$1 RETURNING *`,
      [id, String(reason), maxAttempts, backoffMs],
    );
    return rows[0];
  }
  async createExportRequest(userId) {
    return this.transaction(async (tx) => {
      const { rows } = await tx.query(
        "INSERT INTO export_requests(user_id,expires_at) VALUES($1,now()+interval '24 hours') RETURNING *",
        [userId],
      );
      await tx.createJob("data_export", rows[0].id);
      await tx.audit("export_request", userId, userId);
      return rows[0];
    });
  }
  async createDeletionRequest(userId) {
    return this.transaction(async (tx) => {
      await tx.query("UPDATE users SET status='deletion_pending' WHERE id=$1", [
        userId,
      ]);
      await tx.revokeUserSessions(userId);
      const { rows } = await tx.query(
        "INSERT INTO deletion_requests(user_id,cooling_off_until) VALUES($1,now()+interval '7 days') RETURNING *",
        [userId],
      );
      await tx.createJob(
        "account_deletion",
        rows[0].id,
        rows[0].cooling_off_until,
      );
      await tx.audit("deletion_request", userId, userId);
      return rows[0];
    });
  }
  async approveRole(actorId, userId, role, reason) {
    return this.transaction(async (tx) => {
      const { rows } = await tx.query(
        "INSERT INTO role_approvals(user_id,role_code,approved_by,reason) VALUES($1,$2,$3,$4) RETURNING id",
        [userId, role, actorId, reason],
      );
      await tx.query(
        "INSERT INTO user_roles(user_id,role_code,approval_id) VALUES($1,$2,$3) ON CONFLICT(user_id,role_code) DO NOTHING",
        [userId, role, rows[0].id],
      );
      await tx.audit("role_change", actorId, userId, { role });
    });
  }
  async hasMembership(userId, organizationId) {
    return this.transaction(
      async (tx) => {
        const { rows } = await tx.query(
          "SELECT 1 FROM organization_memberships WHERE user_id=$1 AND organization_id=$2 AND status='active'",
          [userId, organizationId],
        );
        return Boolean(rows[0]);
      },
      { organizationIds: [organizationId] },
    );
  }
  async createBlock(blockerId, blockedId) {
    const { rows } = await this.query(
      "INSERT INTO blocks(blocker_id,blocked_id) VALUES($1,$2) RETURNING *",
      [blockerId, blockedId],
    );
    return rows[0];
  }
  async createReport(reporterId, subjectId, reason) {
    const { rows } = await this.query(
      "INSERT INTO reports(reporter_id,subject_user_id,reason) VALUES($1,$2,$3) RETURNING *",
      [reporterId, subjectId, reason],
    );
    return rows[0];
  }
  async upsertProfile(userId, profile) {
    const { rows } = await this.query(
      `INSERT INTO profiles(user_id,display_name,pronouns,locale) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,pronouns=EXCLUDED.pronouns,locale=EXCLUDED.locale,updated_at=now() RETURNING *`,
      [
        userId,
        profile.displayName,
        profile.pronouns ?? null,
        profile.locale ?? "en",
      ],
    );
    return rows[0];
  }
  async createHealthEntry(userId, entry) {
    const { rows } = await this.query(
      `INSERT INTO health_entries(user_id,kind,label_ciphertext,details_ciphertext,visibility) VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [
        userId,
        entry.kind,
        entry.labelCiphertext,
        entry.detailsCiphertext ?? null,
        entry.visibility ?? "private",
      ],
    );
    return rows[0];
  }
  async listOwnHealthEntries(userId) {
    const { rows } = await this.query(
      "SELECT * FROM health_entries WHERE user_id=$1 ORDER BY created_at",
      [userId],
    );
    return rows;
  }
  async createOrganization(input) {
    const { rows } = await this.query(
      "INSERT INTO organizations(name,kind) VALUES($1,$2) RETURNING *",
      [input.name, input.kind],
    );
    return rows[0];
  }
  async addOrganizationMembership(input) {
    return this.transaction(
      async (tx) => {
        const { rows } = await tx.query(
          `INSERT INTO organization_memberships(organization_id,user_id,role_code,status,approved_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,
          [
            input.organizationId,
            input.userId,
            input.roleCode,
            input.status ?? "pending",
            input.approvedBy ?? null,
          ],
        );
        return rows[0];
      },
      { organizationIds: [input.organizationId] },
    );
  }
  async createDocumentMetadata(ownerId, input) {
    const { rows } = await this.query(
      `INSERT INTO documents(owner_id,object_id,storage_provider,encrypted_object_key,encrypted_data_key,mime_type,size_bytes,checksum,scan_status,retention_at,access_policy) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        ownerId,
        input.objectId,
        input.storageProvider,
        input.encryptedObjectKey,
        input.encryptedDataKey,
        input.mimeType,
        input.sizeBytes,
        input.checksum,
        input.malwareScanStatus ?? "pending",
        input.retentionAt ?? null,
        input.accessPolicy ?? {},
      ],
    );
    return rows[0];
  }
  async getOwnDocument(ownerId, id) {
    const { rows } = await this.query(
      "SELECT * FROM documents WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL",
      [id, ownerId],
    );
    return rows[0] ?? null;
  }
  async createImportedRecordMetadata(userId, input) {
    const { rows } = await this.query(
      "INSERT INTO imported_records(user_id,document_id,source,payload_ciphertext) VALUES($1,$2,$3,$4) RETURNING *",
      [userId, input.documentId ?? null, input.source, input.payloadCiphertext],
    );
    return rows[0];
  }
  async createNotification(userId, kind, payload = {}) {
    const { rows } = await this.query(
      "INSERT INTO notifications(user_id,kind,payload) VALUES($1,$2,$3) RETURNING *",
      [userId, kind, payload],
    );
    return rows[0];
  }
  async setFeatureFlag(actorId, key, environment, enabled, rules = {}) {
    return this.transaction(async (tx) => {
      const { rows } = await tx.query(
        `INSERT INTO feature_flags(key,environment,enabled,rules) VALUES($1,$2,$3,$4) ON CONFLICT(key,environment) DO UPDATE SET enabled=EXCLUDED.enabled,rules=EXCLUDED.rules RETURNING *`,
        [key, environment, enabled, rules],
      );
      await tx.audit("feature_flag_change", actorId, actorId, {
        key,
        environment,
      });
      return rows[0];
    });
  }
  async recordModerationAction(input) {
    const { rows } = await this.query(
      "INSERT INTO moderation_actions(report_id,moderator_id,action,rationale) VALUES($1,$2,$3,$4) RETURNING *",
      [input.reportId, input.moderatorId, input.action, input.rationale],
    );
    await this.audit("moderation_action", input.moderatorId, null, {
      reportId: input.reportId,
    });
    return rows[0];
  }
  async recordContentReview(input) {
    const { rows } = await this.query(
      "INSERT INTO content_reviews(content_id,reviewer_id,reviewer_role,decision,notes) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [
        input.contentId,
        input.reviewerId,
        input.reviewerRole,
        input.decision,
        input.notes ?? null,
      ],
    );
    return rows[0];
  }
  async recordEvidenceSource(input) {
    const { rows } = await this.query(
      "INSERT INTO evidence_sources(content_id,citation,url,accessed_at) VALUES($1,$2,$3,$4) RETURNING *",
      [input.contentId, input.citation, input.url ?? null, input.accessedAt],
    );
    return rows[0];
  }
}
