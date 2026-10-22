import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../server/store.mjs";
import { MonaService } from "../server/service.mjs";

test("role-specific onboarding persists privately and rejects unauthorized fields and consent", async () => {
  const store = new MemoryStore();
  const service = new MonaService(store);
  for (const role of ["patient", "survivor", "caregiver"]) {
    const actor = store.createUser({
      email: `${role}@example.test`,
      passwordHash: "synthetic",
      roles: [role],
    });
    actor.roles = [role];
    const details =
      role === "patient"
        ? {
            diagnosis: "Fictional diagnosis",
            symptoms: "Fictional symptom",
            medications: "Fictional medication",
          }
        : role === "survivor"
          ? {
              livedExperience: "Fictional experience",
              availability: "Weekends",
              willingToMentor: true,
              matchingConsent: true,
            }
          : { caregiverInformation: "Fictional caregiver" };
    const onboarding = {
      ...details,
      supportPreferences: "Peer support",
      privacy: "private",
      consentVersion: "synthetic-onboarding-v1",
      consent: true,
    };
    const saved = await service.saveOwnProfile(actor, {
      displayName: "Synthetic Person",
      onboarding,
    });
    assert.equal(saved.onboarding.accountType, role);
    assert.ok(saved.onboarding.completedAt);
    assert.equal(saved.onboarding.privacy, "private");
    assert.deepEqual(await service.ownProfile(actor), saved);
    for (const bad of [
      { ...onboarding, consent: false },
      { ...onboarding, userId: "other" },
      { ...onboarding, privacy: "public" },
      { ...onboarding, supportPreferences: "x".repeat(1001) },
      { ...onboarding, consentVersion: "old" },
      { ...onboarding, matchingConsent: "true" },
    ]) {
      await assert.rejects(
        service.saveOwnProfile(actor, {
          displayName: "Synthetic",
          onboarding: bad,
        }),
        (e) => e.statusCode === 400,
      );
    }
    await service.saveOwnProfile(actor, { displayName: "Renamed" });
    assert.deepEqual(
      (await service.ownProfile(actor)).onboarding,
      saved.onboarding,
    );
  }
  const other = store.createUser({
    email: "other@example.test",
    passwordHash: "synthetic",
  });
  assert.equal((await service.ownProfile(other)).onboarding, undefined);
});
