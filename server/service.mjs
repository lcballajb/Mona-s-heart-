import { hashPassword, verifyPassword, opaqueToken, tokenDigest, PUBLIC_ROLES, PRIVILEGED_ROLES, canViewHealth, requireAnyRole } from './security.mjs';

const SESSION_MS = 30 * 60 * 1000;
export class MonaService {
  constructor(store) { this.store = store; }
  async register({ email, password, role = 'patient' }) {
    if (!/^\S+@\S+\.\S+$/.test(email) || this.store.findUserByEmail(email)) throw Object.assign(new Error('Registration unavailable'), { statusCode: 400 });
    if (!PUBLIC_ROLES.has(role)) throw Object.assign(new Error('Privileged roles require approval'), { statusCode: 403 });
    const user = this.store.createUser({ email, passwordHash: await hashPassword(password), roles: [role] });
    const verificationToken = opaqueToken(); // Deliver through a transactional email provider; only its digest belongs in PostgreSQL.
    user.verificationDigest = tokenDigest(verificationToken);
    return { userId: user.id, verificationToken };
  }
  verifyEmail(token) {
    const user = [...this.store.users.values()].find((entry) => entry.verificationDigest === tokenDigest(token ?? ''));
    if (!user) throw Object.assign(new Error('Invalid or expired verification token'), { statusCode: 400 });
    user.verifiedAt = this.store.now(); user.status = 'active'; delete user.verificationDigest; return user;
  }
  async signIn({ email, password }) {
    const user = this.store.findUserByEmail(email);
    const now = this.store.clock().getTime();
    if (!user || (user.lockedUntil && Date.parse(user.lockedUntil) > now) || !(await verifyPassword(password, user.passwordHash))) {
      if (user) { user.failedAttempts += 1; if (user.failedAttempts >= 5) user.lockedUntil = new Date(now + 15 * 60_000).toISOString(); }
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    if (!user.verifiedAt || user.status !== 'active') throw Object.assign(new Error('Account unavailable'), { statusCode: 403 });
    user.failedAttempts = 0; user.lockedUntil = null;
    const token = opaqueToken(); const session = this.store.createSession(user.id, token, SESSION_MS);
    this.store.audit('login', user.id, user.id); return { token, csrfToken: session.csrfToken, expiresAt: session.expiresAt };
  }
  signOut(token) { const session = this.store.session(token); if (session) session.revokedAt = this.store.now(); }
  actor(token) { const session = this.store.session(token); return session ? this.store.users.get(session.userId) : null; }
  approveRole(actor, userId, role, reason) {
    requireAnyRole(actor, ['administrator']); if (!PRIVILEGED_ROLES.has(role) || !reason) throw new Error('Invalid role approval');
    const user = this.store.users.get(userId); if (!user) throw new Error('User not found');
    this.store.roleApprovals.push({ userId, role, approvedBy: actor.id, reason, approvedAt: this.store.now() });
    if (!user.roles.includes(role)) user.roles.push(role); this.store.audit('role_change', actor.id, userId, { role });
  }
  viewHealth(actor, ownerId, field) {
    const allowed = canViewHealth({ actor, ownerId, visibility: field.visibility, connected: field.connected,
      matchedMentor: field.matchedMentor, authorizedOrganization: field.authorizedOrganization });
    if (!allowed) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    this.store.audit('profile_access', actor.id, ownerId, { fieldType: field.type }); return field.value;
  }
  readMessage(actor, message) { if (![message.senderId, message.recipientId].includes(actor.id)) throw Object.assign(new Error('Forbidden'), { statusCode: 403 }); return message; }
  readDocument(actor, document) { if (document.ownerId !== actor.id) throw Object.assign(new Error('Forbidden'), { statusCode: 403 }); this.store.audit('document_access', actor.id, document.ownerId); return document; }
  organizationData(actor, organizationId) {
    if (!this.store.memberships.some((m) => m.userId === actor.id && m.organizationId === organizationId && m.status === 'active')) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    this.store.audit('organization_access', actor.id, actor.id, { organizationId }); return { organizationId };
  }
  recordConsent(actor, purpose, version) { const row = { userId: actor.id, purpose, version, grantedAt: this.store.now(), withdrawnAt: null }; this.store.consents.push(row); this.store.audit('consent_change', actor.id, actor.id, { purpose, action: 'grant' }); return row; }
  withdrawConsent(actor, purpose) { const row = [...this.store.consents].reverse().find((c) => c.userId === actor.id && c.purpose === purpose && !c.withdrawnAt); if (!row) throw new Error('Active consent not found'); row.withdrawnAt = this.store.now(); this.store.audit('consent_change', actor.id, actor.id, { purpose, action: 'withdraw' }); return row; }
  exportData(actor) { this.store.audit('data_export', actor.id, actor.id); return { user: { id: actor.id, email: actor.email, roles: actor.roles }, consents: this.store.consents.filter((c) => c.userId === actor.id), profile: this.store.profiles.get(actor.id) ?? null }; }
  deleteAccount(actor) { actor.status = 'deletion_pending'; actor.email = `deleted-${actor.id}@invalid.local`; actor.passwordHash = '!'; for (const session of this.store.sessions.values()) if (session.userId === actor.id) session.revokedAt = this.store.now(); this.store.audit('data_deletion', actor.id, actor.id); }
  block(actor, blockedId) { const row = { blockerId: actor.id, blockedId, createdAt: this.store.now() }; this.store.blocks.push(row); return row; }
  report(actor, subjectId, reason) { const row = { reporterId: actor.id, subjectId, reason, status: 'open', createdAt: this.store.now() }; this.store.reports.push(row); return row; }
}
