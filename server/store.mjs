import { randomUUID } from 'node:crypto';
import { tokenDigest } from './security.mjs';

export class MemoryStore {
  constructor(clock = () => new Date()) {
    this.clock = clock; this.users = new Map(); this.sessions = new Map(); this.audits = [];
    this.consents = []; this.profiles = new Map(); this.messages = []; this.documents = [];
    this.memberships = []; this.roleApprovals = []; this.blocks = []; this.reports = [];
  }
  now() { return this.clock().toISOString(); }
  audit(type, actorId, subjectId, metadata = {}) {
    const event = { id: randomUUID(), type, actorId, subjectId, metadata, occurredAt: this.now() };
    this.audits.push(event); return event;
  }
  createUser(input) {
    const id = randomUUID();
    const user = { id, email: input.email.toLowerCase(), passwordHash: input.passwordHash, roles: input.roles ?? ['patient'],
      status: 'pending_verification', verifiedAt: null, failedAttempts: 0, lockedUntil: null, createdAt: this.now() };
    this.users.set(id, user); return user;
  }
  findUserByEmail(email) { return [...this.users.values()].find((u) => u.email === email.toLowerCase()); }
  createSession(userId, rawToken, ttlMs) {
    const session = { id: randomUUID(), userId, digest: tokenDigest(rawToken), csrfToken: randomUUID(),
      expiresAt: new Date(this.clock().getTime() + ttlMs).toISOString(), revokedAt: null };
    this.sessions.set(session.digest, session); return session;
  }
  session(rawToken) {
    const found = this.sessions.get(tokenDigest(rawToken));
    if (!found || found.revokedAt || Date.parse(found.expiresAt) <= this.clock().getTime()) return null;
    return found;
  }
}
