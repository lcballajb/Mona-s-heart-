import {
  hashPassword,
  verifyPassword,
  opaqueToken,
  PUBLIC_ROLES,
  PRIVILEGED_ROLES,
  canViewHealth,
  requireAnyRole,
} from "./security.mjs";
import { renderEmail } from "./email-provider.mjs";

const SESSION_MS = 30 * 60 * 1000;
const TOKEN_MS = 60 * 60 * 1000;
export class MonaService {
  constructor(store, emailProvider = null, rateLimiter = null) {
    this.store = store;
    this.emailProvider = emailProvider;
    this.rateLimiter = rateLimiter;
    this.dummyPasswordHash = hashPassword(
      "unknown account comparison password",
    );
  }
  async register({ email, password, role = "patient" }) {
    if (
      !/^\S+@\S+\.\S+$/.test(email) ||
      (await this.store.findUserByEmail(email))
    )
      throw Object.assign(new Error("Registration unavailable"), {
        statusCode: 400,
      });
    if (!PUBLIC_ROLES.has(role))
      throw Object.assign(new Error("Privileged roles require approval"), {
        statusCode: 403,
      });
    const user = await this.store.createUser({
      email,
      passwordHash: await hashPassword(password),
      passwordAlgorithm: "scrypt-v1",
      roles: [role],
    });
    const verificationToken = opaqueToken();
    await this.store.createAccountToken(
      user.id,
      "email_verification",
      verificationToken,
      TOKEN_MS,
    );
    await this.emailProvider?.send({
      to: user.email,
      template: renderEmail({
        kind: "account_verification",
        actionUrl: `${process.env.PUBLIC_APP_URL ?? "https://app.example.invalid"}/verify?token=${encodeURIComponent(verificationToken)}`,
      }),
    });
    await this.store.audit("verification_email_requested", user.id, user.id, {
      templateVersion: "1",
    });
    return { userId: user.id, verificationToken };
  }
  async verifyEmail(token) {
    const id = await this.store.consumeAccountToken(
      "email_verification",
      token ?? "",
    );
    if (!id)
      throw Object.assign(new Error("Invalid or expired verification token"), {
        statusCode: 400,
      });
    const user = await this.store.verifyUser(id);
    await this.store.audit("email_verification", id, id);
    return user;
  }
  async signIn({ email, password }) {
    const user = await this.store.findUserByEmail(email);
    const now = this.store.clock().getTime();
    const passwordMatches = await verifyPassword(
      password,
      user?.passwordHash ?? (await this.dummyPasswordHash),
    );
    if (
      !user ||
      (user.lockedUntil && Date.parse(user.lockedUntil) > now) ||
      !passwordMatches
    ) {
      if (user) {
        await this.store.recordLoginFailure(user.id);
        await this.store.audit("failed_login", user.id, user.id, {
          result: "failure",
        });
      }
      throw Object.assign(new Error("Invalid credentials"), {
        statusCode: 401,
      });
    }
    if (!user.verifiedAt || user.status !== "active")
      throw Object.assign(new Error("Account unavailable"), {
        statusCode: 403,
      });
    await this.store.clearLoginFailures(user.id);
    const token = opaqueToken();
    const session = await this.store.createSession(user.id, token, SESSION_MS);
    await this.store.audit("login", user.id, user.id);
    return {
      token,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  }
  async requestPasswordReset({ email, locale = "en", region = "global" }) {
    const generic = {
      status: "If the account is eligible, an email will be sent",
    };
    const user = await this.store.findUserByEmail(String(email ?? ""));
    if (!user) {
      await verifyPassword("comparison password", await this.dummyPasswordHash);
      return generic;
    }
    const limit = await this.rateLimiter?.consume(`password_reset:${user.id}`, {
      limit: 3,
      windowMs: 60 * 60_000,
    });
    if (limit && !limit.allowed) return generic;
    const token = opaqueToken();
    await this.store.createAccountToken(
      user.id,
      "password_reset",
      token,
      30 * 60_000,
    );
    await this.emailProvider?.send({
      to: user.email,
      template: renderEmail({
        kind: "password_reset",
        locale,
        region,
        actionUrl: `${process.env.PUBLIC_APP_URL ?? "https://app.example.invalid"}/reset-password?token=${encodeURIComponent(token)}`,
      }),
    });
    await this.store.audit("password_reset_requested", user.id, user.id, {
      templateVersion: "1",
    });
    return generic;
  }
  async resetPassword({ token, password }) {
    const userId = await this.store.consumeAccountToken(
      "password_reset",
      token ?? "",
    );
    if (!userId)
      throw Object.assign(new Error("Invalid or expired reset token"), {
        statusCode: 400,
      });
    await this.store.updatePassword(userId, await hashPassword(password));
    await this.store.revokeUserSessions(userId);
    await this.store.audit("password_reset_completed", userId, userId);
    return { status: "password_updated" };
  }
  async signOut(token) {
    const session = await this.store.session(token);
    if (session) {
      await this.store.revokeSession(token);
      await this.store.audit("logout", session.userId, session.userId);
    }
  }
  async actor(token) {
    const session = await this.store.session(token);
    return session ? this.store.findUserById(session.userId) : null;
  }
  async approveRole(actor, userId, role, reason) {
    requireAnyRole(actor, ["administrator"]);
    if (!PRIVILEGED_ROLES.has(role) || !reason)
      throw new Error("Invalid role approval");
    if (!(await this.store.findUserById(userId)))
      throw new Error("User not found");
    return this.store.approveRole(actor.id, userId, role, reason);
  }
  async viewHealth(actor, ownerId, field) {
    if (
      !canViewHealth({
        actor,
        ownerId,
        visibility: field.visibility,
        connected: field.connected,
        matchedMentor: field.matchedMentor,
        authorizedOrganization: field.authorizedOrganization,
      })
    )
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    await this.store.audit("health_data_read", actor.id, ownerId, {
      fieldType: field.type,
    });
    return field.value;
  }
  async readMessage(actor, message) {
    if (![message.senderId, message.recipientId].includes(actor.id))
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    return message;
  }
  async readDocument(actor, document) {
    if (document.ownerId !== actor.id)
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    await this.store.audit("document_access", actor.id, document.ownerId);
    return document;
  }
  async organizationData(actor, organizationId) {
    if (!(await this.store.hasMembership(actor.id, organizationId)))
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    await this.store.audit("organization_access", actor.id, actor.id, {
      organizationId,
    });
    return { organizationId };
  }
  async recordConsent(actor, purpose, version, details = {}) {
    const row = await this.store.recordConsent({
      userId: actor.id,
      purpose,
      version,
      granted: true,
      withdrawnAt: null,
      sourceInterface: details.sourceInterface ?? "web",
      region: details.region ?? "unspecified",
      language: details.language ?? "en",
      organizationId: details.organizationId ?? null,
    });
    await this.store.audit("consent_change", actor.id, actor.id, {
      purpose,
      action: "grant",
    });
    return row;
  }
  async withdrawConsent(actor, purpose, version = "current", details = {}) {
    const row = await this.store.recordConsent({
      userId: actor.id,
      purpose,
      version,
      granted: false,
      withdrawnAt: this.store.now(),
      sourceInterface: details.sourceInterface ?? "web",
      region: details.region ?? "unspecified",
      language: details.language ?? "en",
      organizationId: details.organizationId ?? null,
    });
    await this.store.audit("consent_change", actor.id, actor.id, {
      purpose,
      action: "withdraw",
    });
    return row;
  }
  async exportData(actor) {
    return this.store.createExportRequest(actor.id);
  }
  async deleteAccount(actor) {
    return this.store.createDeletionRequest(actor.id);
  }
  async block(actor, blockedId) {
    return this.store.createBlock(actor.id, blockedId);
  }
  async report(actor, subjectId, reason) {
    return this.store.createReport(actor.id, subjectId, reason);
  }
}
