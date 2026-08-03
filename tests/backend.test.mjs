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
  await service.verifyEmail(registration.verificationToken);
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
  await service.verifyEmail(registration.verificationToken);
  const login = await service.signIn({
    email: user.email,
    password: "correct horse battery staple",
  });
  assert.equal((await service.actor(login.token)).id, user.id);
  assert.equal(store.audits.at(-1).type, "login");
  await service.signOut(login.token);
  assert.equal(await service.actor(login.token), null);
  const second = await service.signIn({
    email: user.email,
    password: "correct horse battery staple",
  });
  time = new Date("2026-01-01T00:31:00Z");
  assert.equal(await service.actor(second.token), null);
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
  await service.approveRole(
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
  await assert.rejects(
    () =>
      service.viewHealth(bob, alice.id, {
        type: "condition",
        value: "private",
        visibility: "private",
      }),
    /Forbidden/,
  );
  assert.equal(
    await service.viewHealth(bob, alice.id, {
      type: "condition",
      value: "shared",
      visibility: "approved_connections",
      connected: true,
    }),
    "shared",
  );
  await assert.rejects(
    () =>
      service.viewHealth(alice, alice.id, {
        type: "condition",
        value: "hidden",
        visibility: "explicitly_hidden",
      }),
    /Forbidden/,
  );
  await assert.rejects(
    () =>
      service.readMessage(bob, {
        senderId: alice.id,
        recipientId: "third-user",
        body: "secret",
      }),
    /Forbidden/,
  );
  await assert.rejects(
    () =>
      service.readDocument(bob, { ownerId: alice.id, storageKey: "opaque" }),
    /Forbidden/,
  );
  await service.readDocument(alice, {
    ownerId: alice.id,
    storageKey: "opaque",
  });
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
  assert.deepEqual(await service.organizationData(coordinator, "hospital-a"), {
    organizationId: "hospital-a",
  });
  await assert.rejects(
    () => service.organizationData(coordinator, "hospital-b"),
    /Forbidden/,
  );
  assert.equal(store.audits.at(-1).type, "organization_access");
});

test("consent grant and withdrawal are timestamped and audited", async () => {
  const { store, service } = await fixture();
  const user = await active(service, store, "consent@example.test");
  const consent = await service.recordConsent(user, "peer_matching", "2026-01");
  assert.equal(consent.withdrawnAt, null);
  await service.withdrawConsent(user, "peer_matching");
  assert.equal(consent.withdrawnAt, null);
  assert.equal(store.consents.at(-1).granted, false);
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
  const exported = await service.exportData(alice);
  assert.equal(exported.userId, alice.id);
  assert.notEqual(exported.userId, bob.id);
  assert.equal(store.jobs.at(-1).kind, "data_export");
  assert.equal(store.audits.at(-1).type, "export_request");
  await service.deleteAccount(alice);
  assert.equal(alice.status, "deletion_pending");
  assert.equal(await service.actor(login.token), null);
  assert.equal(store.audits.at(-1).type, "deletion_request");
});

test("blocks and reports preserve actor scope", async () => {
  const { store, service } = await fixture();
  const alice = await active(service, store, "reporter@example.test");
  const bob = await active(service, store, "reported@example.test");
  await service.block(alice, bob.id);
  await service.report(alice, bob.id, "harassment");
  assert.deepEqual(store.blocks[0], {
    blockerId: alice.id,
    blockedId: bob.id,
    createdAt: store.blocks[0].createdAt,
  });
  assert.equal(store.reports[0].reporterId, alice.id);
  assert.equal(store.reports[0].status, "open");
});
