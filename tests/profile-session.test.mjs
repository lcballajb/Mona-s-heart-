import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../server/store.mjs";
import { MonaService } from "../server/service.mjs";

test("own profile DTO persists without allowing owner or role assignment", async () => {
  const store = new MemoryStore();
  const service = new MonaService(store);
  const actor = store.createUser({
    email: "alice@example.test",
    passwordHash: "synthetic",
  });
  const other = store.createUser({
    email: "bob@example.test",
    passwordHash: "synthetic",
  });
  assert.deepEqual(await service.ownProfile(actor), {
    displayName: "",
    pronouns: "",
    locale: "en",
  });
  const input = {
    displayName: "  Synthetic Alice  ",
    pronouns: "she/her",
    locale: "en-us",
  };
  const expected = {
    displayName: "Synthetic Alice",
    pronouns: "she/her",
    locale: "en-US",
  };
  assert.deepEqual(await service.saveOwnProfile(actor, input), expected);
  assert.deepEqual(await service.ownProfile(actor), expected);
  assert.equal((await service.ownProfile(other)).displayName, "");
  for (const extra of [
    { userId: other.id },
    { ownerId: other.id },
    { roles: ["administrator"] },
    { diagnosis: "synthetic" },
  ])
    await assert.rejects(
      service.saveOwnProfile(actor, { ...input, ...extra }),
      (e) => e.statusCode === 400,
    );
  for (const bad of [
    null,
    [],
    { displayName: " " },
    { displayName: "x".repeat(81) },
    { displayName: "Alice", pronouns: 4 },
    { displayName: "Alice", locale: "not a locale" },
  ])
    await assert.rejects(
      service.saveOwnProfile(actor, bad),
      (e) => e.statusCode === 400,
    );
  assert.deepEqual(await service.ownProfile(actor), expected);
});

test("session CSRF restoration is stable across tabs and refuses revoked sessions", async () => {
  const store = new MemoryStore();
  const user = store.createUser({
    email: "csrf@example.test",
    passwordHash: "synthetic",
  });
  const session = store.createSession(
    user.id,
    "synthetic-session-secret",
    60000,
  );
  const tokens = await Promise.all([
    store.restoreSessionCsrf("synthetic-session-secret"),
    store.restoreSessionCsrf("synthetic-session-secret"),
  ]);
  assert.equal(tokens[0], tokens[1]);
  assert.equal(tokens[0], session.csrfToken);
  assert.equal(store.validateCsrf(session, tokens[0]), true);
  assert.notEqual(tokens[0], "synthetic-session-secret");
  store.revokeSession("synthetic-session-secret");
  assert.equal(
    await store.restoreSessionCsrf("synthetic-session-secret"),
    null,
  );
});
