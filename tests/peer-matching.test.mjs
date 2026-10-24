import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../server/store.mjs";
import { MonaService } from "../server/service.mjs";
const card = {
  alias: "Synthetic Sam",
  introduction: "Only explicitly shared text",
  availability: "Weekends",
  published: true,
  consent: true,
  version: "synthetic-discovery-v1",
};
const request = (survivorId) => ({
  survivorId,
  alias: "Synthetic Pat",
  consent: true,
  version: "synthetic-match-request-v1",
});
async function setup() {
  const store = new MemoryStore();
  const service = new MonaService(store);
  const users = [];
  for (const role of ["patient", "survivor", "caregiver", "survivor"]) {
    const u = store.createUser({
      email: `${role}-${users.length}@example.test`,
      passwordHash: "synthetic",
      roles: [role],
    });
    store.verifyUser(u.id);
    await service.saveOwnProfile(u, {
      displayName: "Private name",
      onboarding: {
        consent: true,
        consentVersion: "synthetic-onboarding-v1",
        privacy: "private",
        supportPreferences: "PRIVATE DETAILS",
      },
    });
    users.push(u);
  }
  return { store, service, users };
}
test("explicit discovery, request and recipient acceptance preserve private profile isolation", async () => {
  const {
    service,
    users: [p, s, c, other],
  } = await setup();
  assert.deepEqual((await service.peers(p, "state")).cards, []);
  await assert.rejects(
    service.peers(p, "card", card),
    (e) => e.statusCode === 403,
  );
  await assert.rejects(
    service.peers(s, "card", { ...card, consent: false }),
    (e) => e.statusCode === 400,
  );
  await assert.rejects(
    service.peers(s, "card", { ...card, userId: other.id }),
    (e) => e.statusCode === 400,
  );
  await service.peers(s, "card", card);
  const shared = await service.peers(p, "state");
  assert.equal(shared.cards[0].alias, card.alias);
  assert.doesNotMatch(
    JSON.stringify(shared),
    /PRIVATE DETAILS|Private name|example.test/,
  );
  const r = await service.peers(p, "request", request(s.id));
  assert.deepEqual(await service.peers(p, "request", request(s.id)), r);
  await assert.rejects(
    service.peers(p, "respond", { requestId: r.id, action: "accepted" }),
    (e) => e.statusCode === 403,
  );
  await assert.rejects(
    service.peers(other, "respond", { requestId: r.id, action: "accepted" }),
    (e) => e.statusCode === 404,
  );
  assert.deepEqual((await service.peers(other, "state")).requests, []);
  await service.peers(s, "respond", { requestId: r.id, action: "accepted" });
  assert.equal(
    (await service.peers(p, "state")).requests[0].status,
    "accepted",
  );
  await service.peers(p, "respond", { requestId: r.id, action: "withdrawn" });
  assert.equal(
    (await service.peers(s, "state")).requests[0].status,
    "unavailable",
  );
  const cr = await service.peers(c, "request", request(s.id));
  await service.peers(s, "respond", { requestId: cr.id, action: "declined" });
  await assert.rejects(
    service.peers(s, "respond", { requestId: cr.id, action: "accepted" }),
    (e) => e.statusCode === 409,
  );
});
test("withdrawal and blocks invalidate pending and accepted matches in both directions", async () => {
  const {
    store,
    service,
    users: [p, s, c],
  } = await setup();
  await service.peers(s, "card", card);
  const r = await service.peers(p, "request", request(s.id));
  await service.peers(s, "respond", { requestId: r.id, action: "accepted" });
  await service.peers(s, "card", { published: false, version: card.version });
  assert.deepEqual((await service.peers(p, "state")).cards, []);
  assert.equal(
    (await service.peers(p, "state")).requests[0].status,
    "unavailable",
  );
  assert.deepEqual(
    (await service.consentHistory(s))
      .filter((e) => e.purpose === "synthetic_discovery")
      .map((e) => e.granted),
    [false, true],
  );
  await service.peers(s, "card", card);
  assert.equal(
    (await service.peers(p, "state")).requests[0].status,
    "unavailable",
  );
  await service.peers(p, "block", { targetId: s.id });
  await assert.rejects(
    service.peers(p, "request", request(s.id)),
    (e) => e.statusCode === 404,
  );
  const cr = await service.peers(c, "request", request(s.id));
  await service.peers(s, "block", { targetId: c.id });
  await assert.rejects(
    service.peers(s, "respond", { requestId: cr.id, action: "accepted" }),
  );
  assert.deepEqual((await service.peers(c, "state")).cards, []);
  store.users.get(s.id).status = "deactivated";
  await assert.rejects(service.peers(s, "state"), (e) => e.statusCode === 403);
});
