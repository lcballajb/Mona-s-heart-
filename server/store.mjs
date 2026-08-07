import { randomUUID } from "node:crypto";
import { tokenDigest } from "./security.mjs";

export class MemoryStore {
  constructor(clock = () => new Date(), { sessionPepper = "" } = {}) {
    this.clock = clock;
    this.sessionPepper = sessionPepper;
    this.users = new Map();
    this.sessions = new Map();
    this.audits = [];
    this.consents = [];
    this.profiles = new Map();
    this.messages = [];
    this.documents = [];
    this.memberships = [];
    this.roleApprovals = [];
    this.blocks = [];
    this.reports = [];
    this.accountTokens = [];
    this.jobs = [];
    this.exportRequests = [];
    this.deletionRequests = [];
    this.organizations = [];
    this.healthEntries = [];
    this.importedRecords = [];
    this.notifications = [];
    this.featureFlags = new Map();
    this.moderationActions = [];
    this.contentReviews = [];
    this.evidenceSources = [];
  }
  now() {
    return this.clock().toISOString();
  }
  audit(type, actorId, subjectId, metadata = {}) {
    const event = {
      id: randomUUID(),
      type,
      actorId,
      subjectId,
      metadata,
      occurredAt: this.now(),
    };
    this.audits.push(event);
    return event;
  }
  createUser(input) {
    const id = randomUUID();
    const user = {
      id,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      passwordAlgorithm: input.passwordAlgorithm ?? "scrypt-v1",
      roles: input.roles ?? ["patient"],
      status: "pending_verification",
      verifiedAt: null,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: this.now(),
    };
    this.users.set(id, user);
    return user;
  }
  findUserById(id) {
    return this.users.get(id) ?? null;
  }
  findUserByEmail(email) {
    return (
      [...this.users.values()].find((u) => u.email === email.toLowerCase()) ??
      null
    );
  }
  createSession(userId, rawToken, ttlMs) {
    const session = {
      id: randomUUID(),
      userId,
      digest: tokenDigest(rawToken, this.sessionPepper),
      csrfToken: randomUUID(),
      createdAt: this.now(),
      expiresAt: new Date(this.clock().getTime() + ttlMs).toISOString(),
      revokedAt: null,
    };
    this.sessions.set(session.digest, session);
    return session;
  }
  session(rawToken) {
    const found = this.sessions.get(tokenDigest(rawToken, this.sessionPepper));
    if (
      !found ||
      found.revokedAt ||
      Date.parse(found.expiresAt) <= this.clock().getTime()
    )
      return null;
    return found;
  }
  validateCsrf(session, rawToken) {
    return session.csrfToken === rawToken;
  }
  createAccountToken(userId, purpose, rawToken, ttlMs) {
    this.accountTokens.push({
      userId,
      purpose,
      digest: tokenDigest(rawToken),
      expiresAt: new Date(this.clock().getTime() + ttlMs).toISOString(),
      consumedAt: null,
    });
  }
  consumeAccountToken(purpose, rawToken) {
    const row = this.accountTokens.find(
      (t) =>
        t.purpose === purpose &&
        t.digest === tokenDigest(rawToken) &&
        !t.consumedAt &&
        Date.parse(t.expiresAt) > this.clock().getTime(),
    );
    if (!row) return null;
    row.consumedAt = this.now();
    return row.userId;
  }
  verifyUser(id) {
    const user = this.users.get(id);
    user.verifiedAt = this.now();
    user.status = "active";
    return user;
  }
  recordLoginFailure(id) {
    const user = this.users.get(id);
    user.failedAttempts++;
    if (user.failedAttempts >= 5)
      user.lockedUntil = new Date(
        this.clock().getTime() + 15 * 60_000,
      ).toISOString();
  }
  clearLoginFailures(id) {
    const user = this.users.get(id);
    user.failedAttempts = 0;
    user.lockedUntil = null;
  }
  updatePassword(id, passwordHash) {
    const user = this.users.get(id);
    user.passwordHash = passwordHash;
    return user;
  }
  revokeSession(rawToken) {
    const row = this.sessions.get(tokenDigest(rawToken, this.sessionPepper));
    if (row) row.revokedAt = this.now();
  }
  revokeUserSessions(id) {
    for (const row of this.sessions.values())
      if (row.userId === id) row.revokedAt = this.now();
  }
  listSessions(userId) {
    return [...this.sessions.values()]
      .filter((row) => row.userId === userId && !row.revokedAt)
      .map(({ digest: _digest, csrfToken: _csrfToken, ...row }) => row);
  }
  revokeSessionById(userId, sessionId) {
    const row = [...this.sessions.values()].find(
      (candidate) => candidate.id === sessionId && candidate.userId === userId,
    );
    if (!row) return false;
    row.revokedAt = this.now();
    return true;
  }
  approveRole(actorId, userId, role, reason) {
    const user = this.users.get(userId);
    this.roleApprovals.push({
      userId,
      role,
      approvedBy: actorId,
      reason,
      approvedAt: this.now(),
    });
    if (!user.roles.includes(role)) user.roles.push(role);
    this.audit("role_change", actorId, userId, { role });
  }
  hasMembership(userId, organizationId) {
    return this.memberships.some(
      (m) =>
        m.userId === userId &&
        m.organizationId === organizationId &&
        m.status === "active",
    );
  }
  recordConsent(input) {
    const row = { ...input, grantedAt: this.now() };
    this.consents.push(row);
    return row;
  }
  createJob(kind, payloadReference, scheduledAt = this.now()) {
    const row = {
      id: randomUUID(),
      kind,
      payloadReference,
      status: "queued",
      attempts: 0,
      scheduledAt,
      lockedAt: null,
      completedAt: null,
      failureReason: null,
      deadLettered: false,
      correlationId: randomUUID(),
      idempotencyKey: `${kind}:${payloadReference}`,
    };
    this.jobs.push(row);
    return row;
  }
  claimJobs({ limit = 1, leaseMs = 60_000 } = {}) {
    const now = this.clock().getTime();
    return this.jobs
      .filter(
        (job) =>
          !job.deadLettered &&
          !job.completedAt &&
          Date.parse(job.scheduledAt) <= now &&
          (job.status === "queued" ||
            (job.status === "running" &&
              Date.parse(job.lockedAt) + leaseMs <= now)),
      )
      .slice(0, limit)
      .map((job) => {
        job.status = "running";
        job.lockedAt = this.now();
        job.attempts += 1;
        return job;
      });
  }
  completeJob(id) {
    const job = this.jobs.find((row) => row.id === id);
    job.status = "completed";
    job.completedAt = this.now();
    job.failureReason = null;
    return job;
  }
  failJob(id, reason, { maxAttempts = 5, backoffMs = 1000 } = {}) {
    const job = this.jobs.find((row) => row.id === id);
    job.failureReason = String(reason).slice(0, 500);
    job.lockedAt = null;
    if (job.attempts >= maxAttempts) {
      job.status = "failed";
      job.deadLettered = true;
    } else {
      job.status = "queued";
      job.scheduledAt = new Date(
        this.clock().getTime() + backoffMs * 2 ** (job.attempts - 1),
      ).toISOString();
    }
    return job;
  }
  createExportRequest(userId) {
    const row = {
      id: randomUUID(),
      userId,
      status: "queued",
      requestedAt: this.now(),
      expiresAt: new Date(this.clock().getTime() + 86_400_000).toISOString(),
    };
    this.exportRequests.push(row);
    this.createJob("data_export", row.id);
    this.audit("export_request", userId, userId);
    return row;
  }
  createDeletionRequest(userId) {
    const user = this.users.get(userId);
    user.status = "deletion_pending";
    this.revokeUserSessions(userId);
    const row = {
      id: randomUUID(),
      userId,
      status: "pending_verification",
      legalHold: false,
      coolingOffUntil: new Date(
        this.clock().getTime() + 7 * 86_400_000,
      ).toISOString(),
    };
    this.deletionRequests.push(row);
    this.createJob("account_deletion", row.id, row.coolingOffUntil);
    this.audit("deletion_request", userId, userId);
    return row;
  }
  createBlock(blockerId, blockedId) {
    const row = { blockerId, blockedId, createdAt: this.now() };
    this.blocks.push(row);
    return row;
  }
  createReport(reporterId, subjectId, reason) {
    const row = {
      reporterId,
      subjectId,
      reason,
      status: "open",
      createdAt: this.now(),
    };
    this.reports.push(row);
    return row;
  }
  upsertProfile(userId, profile) {
    const row = {
      userId,
      displayName: profile.displayName,
      pronouns: profile.pronouns ?? null,
      locale: profile.locale ?? "en",
      updatedAt: this.now(),
    };
    this.profiles.set(userId, row);
    return row;
  }
  createHealthEntry(userId, entry) {
    const row = { id: randomUUID(), userId, ...entry, createdAt: this.now() };
    this.healthEntries.push(row);
    return row;
  }
  listOwnHealthEntries(userId) {
    return this.healthEntries.filter((row) => row.userId === userId);
  }
  createOrganization(input) {
    const row = { id: randomUUID(), ...input, createdAt: this.now() };
    this.organizations.push(row);
    return row;
  }
  addOrganizationMembership(input) {
    const row = {
      ...input,
      status: input.status ?? "pending",
      approvedBy: input.approvedBy ?? null,
      createdAt: this.now(),
    };
    this.memberships.push(row);
    return row;
  }
  createDocumentMetadata(ownerId, input) {
    const row = {
      id: randomUUID(),
      ownerId,
      ...input,
      scanStatus: input.malwareScanStatus ?? "pending",
      createdAt: this.now(),
      deletedAt: null,
    };
    this.documents.push(row);
    return row;
  }
  getOwnDocument(ownerId, id) {
    return (
      this.documents.find(
        (row) => row.id === id && row.ownerId === ownerId && !row.deletedAt,
      ) ?? null
    );
  }
  createImportedRecordMetadata(userId, input) {
    const row = { id: randomUUID(), userId, ...input, createdAt: this.now() };
    this.importedRecords.push(row);
    return row;
  }
  createNotification(userId, kind, payload = {}) {
    const row = {
      id: randomUUID(),
      userId,
      kind,
      payload,
      createdAt: this.now(),
    };
    this.notifications.push(row);
    return row;
  }
  setFeatureFlag(actorId, key, environment, enabled, rules = {}) {
    const row = { key, environment, enabled, rules, updatedAt: this.now() };
    this.featureFlags.set(`${key}:${environment}`, row);
    this.audit("feature_flag_change", actorId, actorId, { key, environment });
    return row;
  }
  recordModerationAction(input) {
    const row = { id: randomUUID(), ...input, createdAt: this.now() };
    this.moderationActions.push(row);
    this.audit("moderation_action", input.moderatorId, null, {
      reportId: input.reportId,
    });
    return row;
  }
  recordContentReview(input) {
    const row = { id: randomUUID(), ...input, createdAt: this.now() };
    this.contentReviews.push(row);
    return row;
  }
  recordEvidenceSource(input) {
    const row = { id: randomUUID(), ...input, createdAt: this.now() };
    this.evidenceSources.push(row);
    return row;
  }
}
