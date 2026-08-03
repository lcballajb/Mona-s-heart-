import { randomUUID } from "node:crypto";
import { tokenDigest } from "./security.mjs";

export class MemoryStore {
  constructor(clock = () => new Date()) {
    this.clock = clock;
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
      digest: tokenDigest(rawToken),
      csrfToken: randomUUID(),
      expiresAt: new Date(this.clock().getTime() + ttlMs).toISOString(),
      revokedAt: null,
    };
    this.sessions.set(session.digest, session);
    return session;
  }
  session(rawToken) {
    const found = this.sessions.get(tokenDigest(rawToken));
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
  revokeSession(rawToken) {
    const row = this.sessions.get(tokenDigest(rawToken));
    if (row) row.revokedAt = this.now();
  }
  revokeUserSessions(id) {
    for (const row of this.sessions.values())
      if (row.userId === id) row.revokedAt = this.now();
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
    };
    this.jobs.push(row);
    return row;
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
}
