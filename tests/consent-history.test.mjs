import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../server/store.mjs";
import { MonaService } from "../server/service.mjs";

test("onboarding consent history preserves grants and withdrawals without private profile text", async () => {
  const store = new MemoryStore();
  const service = new MonaService(store);
  const actor = store.createUser({
    email: "survivor@example.test",
    passwordHash: "synthetic",
    roles: ["survivor"],
  });
  const other = store.createUser({
    email: "other@example.test",
    passwordHash: "synthetic",
  });
  const profile = {
    displayName: "Synthetic Survivor",
    onboarding: {
      consent: true,
      consentVersion: "synthetic-onboarding-v1",
      privacy: "private",
      supportPreferences: "Private synthetic preference",
      livedExperience: "Private synthetic experience",
      matchingConsent: true,
    },
  };
  await service.saveOwnProfile(actor, profile);
  await service.saveOwnProfile(actor, {
    ...profile,
    onboarding: { ...profile.onboarding, matchingConsent: false },
  });
  const history = await service.consentHistory(actor);
  assert.equal(history.length, 4);
  assert.deepEqual(
    history
      .filter((r) => r.purpose === "synthetic_matching")
      .map((r) => r.granted),
    [false, true],
  );
  assert.ok(history.every((r) => r.version && r.recordedAt && r.id));
  assert.doesNotMatch(
    JSON.stringify(history),
    /Private synthetic|example.test/,
  );
  assert.deepEqual(await service.consentHistory(other), []);
  await service.saveOwnProfile(actor, { displayName: "Renamed" });
  assert.deepEqual(await service.consentHistory(actor), history);
  await assert.rejects(
    service.saveOwnProfile(actor, {
      ...profile,
      onboarding: { ...profile.onboarding, consent: false },
    }),
  );
  assert.deepEqual(await service.consentHistory(actor), history);
});
