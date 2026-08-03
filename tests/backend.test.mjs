import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../server/store.mjs";
import { MonaService } from "../server/service.mjs";
import { requireAnyRole, verifyPassword } from "../server/security.mjs";

async function active(service, store, email, role = "patient") {
  const registration = await service.register({
    email,
    password: "correct horse battery staple",
    role,
  });
  service.verifyEmail(registration.verificationToken);
  return store.users.get(registration.userId);
}
async function fixture() {
  const store = new MemoryStore();
  const service = new MonaService(store);
  return { store, service };
}

test("registration hashes passwords, verification gates authentication, sessions expire, and sign-out revokes", async () => {
  let time = new Date("2026-01-01T00:00:00Z");
  const store = new MemoryStore(() => time);
  const service = new MonaService(store);
  const registration = await service.register({
    email: "patient@example.test",
    password: "correct horse battery staple",
  });
  const user = store.users.get(registration.userId);
  assert.notEqual(user.passwordHash, "correct horse battery staple");
  assert.equal(
    await verifyPassword("correct horse battery staple", user.passwordHash),
    true,
  );
  await assert.rejects(
    service.signIn({
      email: user.email,
      password: "correct horse battery staple",
    }),
    /unavailable/,
  );
  service.verifyEmail(registration.verificationToken);
  const login = await service.signIn({
    email: user.email,
    password: "correct horse battery staple",
  });
  assert.equal(service.actor(login.token).id, user.id);
  assert.equal(store.audits.at(-1).type, "login");
  service.signOut(login.token);
  assert.equal(service.actor(login.token), null);
  const second = await service.signIn({
    email: user.email,
    password: "correct horse battery staple",
  });
  time = new Date("2026-01-01T00:31:00Z");
  assert.equal(service.actor(second.token), null);
});

test("abuse protection locks an account and privileged roles cannot be self-assigned", async () => {
  const { store, service } = await fixture();
  const user = await active(service, store, "lock@example.test");
  await assert.rejects(
    service.register({
      email: "admin@example.test",
      password: "correct horse battery staple",
      role: "administrator",
    }),
    /approval/,
  );
  for (let i = 0; i < 5; i += 1)
    await assert.rejects(
      service.signIn({ email: user.email, password: "totally wrong password" }),
      /Invalid credentials/,
    );
  assert.ok(user.lockedUntil);
  await assert.rejects(
    service.signIn({
      email: user.email,
      password: "correct horse battery staple",
    }),
    /Invalid credentials/,
  );
});

test("administrator approval is required and patient is denied admin, moderation, and reviewer data", async () => {
  const { store, service } = await fixture();
  const patient = await active(service, store, "ordinary@example.test");
  const admin = await active(service, store, "owner@example.test");
  admin.roles.push("administrator");
  assert.throws(() => requireAnyRole(patient, ["administrator"]), /Forbidden/);
  assert.throws(() => requireAnyRole(patient, ["moderator"]), /Forbidden/);
  assert.throws(
    () => requireAnyRole(patient, ["content_reviewer", "medical_reviewer"]),
    /Forbidden/,
  );
  service.approveRole(
    admin,
    patient.id,
    "peer_mentor",
    "Fictional training approval",
  );
  assert.ok(patient.roles.includes("peer_mentor"));
  assert.equal(store.roleApprovals.length, 1);
  assert.equal(store.audits.at(-1).type, "role_change");
});

test("cross-user health, messages, and documents are private by default", async () => {
  const { store, service } = await fixture();
  const alice = await active(service, store, "alice@example.test");
  const bob = await active(service, store, "bob@example.test");
  assert.throws(
    () =>
      service.viewHealth(bob, alice.id, {
        type: "condition",
        value: "private",
        visibility: "private",
      }),
    /Forbidden/,
  );
  assert.equal(
    service.viewHealth(bob, alice.id, {
      type: "condition",
      value: "shared",
      visibility: "approved_connections",
      connected: true,
    }),
    "shared",
  );
  assert.throws(
    () =>
      service.viewHealth(alice, alice.id, {
        type: "condition",
        value: "hidden",
        visibility: "explicitly_hidden",
      }),
    /Forbidden/,
  );
  assert.throws(
    () =>
      service.readMessage(bob, {
        senderId: alice.id,
        recipientId: "third-user",
        body: "secret",
      }),
    /Forbidden/,
  );
  assert.throws(
    () =>
      service.readDocument(bob, { ownerId: alice.id, storageKey: "opaque" }),
    /Forbidden/,
  );
  service.readDocument(alice, { ownerId: alice.id, storageKey: "opaque" });
  assert.equal(store.audits.at(-1).type, "document_access");
});

test("organization membership is isolated", async () => {
  const { store, service } = await fixture();
  const coordinator = await active(service, store, "coordinator@example.test");
  store.memberships.push({
    userId: coordinator.id,
    organizationId: "hospital-a",
    status: "active",
  });
  assert.deepEqual(service.organizationData(coordinator, "hospital-a"), {
    organizationId: "hospital-a",
  });
  assert.throws(
    () => service.organizationData(coordinator, "hospital-b"),
    /Forbidden/,
  );
  assert.equal(store.audits.at(-1).type, "organization_access");
});

test("consent grant and withdrawal are timestamped and audited", async () => {
  const { store, service } = await fixture();
  const user = await active(service, store, "consent@example.test");
  const consent = service.recordConsent(user, "peer_matching", "2026-01");
  assert.equal(consent.withdrawnAt, null);
  service.withdrawConsent(user, "peer_matching");
  assert.ok(consent.withdrawnAt);
  assert.deepEqual(
    store.audits.slice(-2).map((event) => event.metadata.action),
    ["grant", "withdraw"],
  );
});

test("export is scoped and deletion deactivates credentials and sessions with audit events", async () => {
  const { store, service } = await fixture();
  const alice = await active(service, store, "export@example.test");
  const bob = await active(service, store, "excluded@example.test");
  store.profiles.set(alice.id, { displayName: "Fictional Alice" });
  const login = await service.signIn({
    email: alice.email,
    password: "correct horse battery staple",
  });
  const exported = service.exportData(alice);
  assert.equal(exported.user.id, alice.id);
  assert.notEqual(exported.user.id, bob.id);
  assert.equal(store.audits.at(-1).type, "data_export");
  service.deleteAccount(alice);
  assert.equal(alice.status, "deletion_pending");
  assert.equal(service.actor(login.token), null);
  assert.equal(store.audits.at(-1).type, "data_deletion");
});

test("blocks and reports preserve actor scope", async () => {
  const { store, service } = await fixture();
  const alice = await active(service, store, "reporter@example.test");
  const bob = await active(service, store, "reported@example.test");
  service.block(alice, bob.id);
  service.report(alice, bob.id, "harassment");
  assert.deepEqual(store.blocks[0], {
    blockerId: alice.id,
    blockedId: bob.id,
    createdAt: store.blocks[0].createdAt,
  });
  assert.equal(store.reports[0].reporterId, alice.id);
  assert.equal(store.reports[0].status, "open");
});
