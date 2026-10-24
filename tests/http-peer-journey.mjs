import assert from "node:assert/strict";
export async function httpPeerJourney({ request, admin, store }) {
  const password = "synthetic matching password 123";
  const post = (path, body, headers = {}) =>
    request(path, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const setup = async (role) => {
    const email = `peer-${role}-${Date.now()}-${Math.random()}@example.test`;
    assert.equal(
      (await post("/v1/auth/register", { email, password, role })).status,
      202,
    );
    const user = (
      await admin.query(
        "UPDATE users SET status='active',email_verified_at=now() WHERE email=$1 RETURNING id",
        [email],
      )
    ).rows[0];
    const login = await post("/v1/auth/sign-in", { email, password });
    assert.equal(login.status, 200);
    const headers = {
      cookie: login.headers.get("set-cookie").split(";")[0],
      "x-csrf-token": (await login.json()).csrfToken,
    };
    const profile = {
      displayName: "Private synthetic name",
      onboarding: {
        consent: true,
        consentVersion: "synthetic-onboarding-v1",
        privacy: "private",
        supportPreferences: "PRIVATE NONSHARED DETAIL",
      },
    };
    assert.equal(
      (
        await request("/v1/profile", {
          method: "PUT",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify(profile),
        })
      ).status,
      200,
    );
    return { id: user.id, headers };
  };
  const p = await setup("patient"),
    s = await setup("survivor"),
    other = await setup("caregiver");
  const state = async (u) => {
    const r = await request("/v1/peers", { headers: u.headers });
    assert.equal(r.status, 200);
    return r.json();
  };
  const publish = {
    alias: "Explicit Synthetic Survivor",
    introduction: "Shared synthetic introduction",
    availability: "Weekends",
    published: true,
    consent: true,
    version: "synthetic-discovery-v1",
  };
  const req = {
    survivorId: s.id,
    alias: "Explicit Synthetic Patient",
    consent: true,
    version: "synthetic-match-request-v1",
  };
  assert.equal((await request("/v1/peers")).status, 401);
  assert.equal((await post("/v1/peers/card", publish, p.headers)).status, 403);
  assert.equal(
    (await post("/v1/peers/card", { ...publish, consent: false }, s.headers))
      .status,
    400,
  );
  assert.equal(
    (await post("/v1/peers/card", publish, { cookie: s.headers.cookie }))
      .status,
    403,
  );
  assert.equal((await post("/v1/peers/card", publish, s.headers)).status, 200);
  assert.ok((await state(p)).cards.some((c) => c.userId === s.id));
  assert.doesNotMatch(
    JSON.stringify(await state(p)),
    /Private synthetic name|PRIVATE NONSHARED|example.test/,
  );
  await admin.query("UPDATE users SET status='deactivated' WHERE id=$1", [
    s.id,
  ]);
  assert.equal(
    (await state(p)).cards.some((c) => c.userId === s.id),
    false,
  );
  assert.equal((await post("/v1/peers/requests", req, p.headers)).status, 404);
  assert.equal(
    (await request("/v1/peers", { headers: s.headers })).status,
    401,
  );
  await admin.query("UPDATE users SET status='active' WHERE id=$1", [s.id]);
  const duplicate = await Promise.all([
    post("/v1/peers/requests", req, p.headers),
    post("/v1/peers/requests", req, p.headers),
  ]);
  for (const r of duplicate) assert.equal(r.status, 200);
  const first = await duplicate[0].json();
  assert.deepEqual(await duplicate[1].json(), first);
  const respond = (actor, id, action) =>
    post("/v1/peers/respond", { requestId: id, action }, actor.headers);
  assert.equal((await respond(p, first.id, "accepted")).status, 403);
  assert.equal((await respond(other, first.id, "accepted")).status, 404);
  assert.deepEqual((await state(other)).requests, []);
  await assert.rejects(
    store.asUser(p.id, (tx) =>
      tx.query("UPDATE peer_match_requests SET status='accepted' WHERE id=$1", [
        first.id,
      ]),
    ),
  );
  assert.equal(
    (
      await store.asUser(other.id, (tx) =>
        tx.query("SELECT id FROM peer_match_requests WHERE id=$1", [first.id]),
      )
    ).rowCount,
    0,
  );
  assert.equal((await respond(s, first.id, "accepted")).status, 200);
  assert.equal((await state(p)).requests[0].status, "accepted");
  assert.equal((await respond(p, first.id, "withdrawn")).status, 200);
  assert.equal((await state(s)).requests[0].status, "unavailable");
  const second = await (
    await post("/v1/peers/requests", req, p.headers)
  ).json();
  const concurrent = await Promise.all([
    respond(s, second.id, "accepted"),
    post(
      "/v1/peers/card",
      { published: false, version: publish.version },
      s.headers,
    ),
  ]);
  assert.ok([200, 409].includes(concurrent[0].status));
  assert.equal(concurrent[1].status, 200);
  assert.equal(
    (await state(p)).requests.every((r) => r.status === "unavailable"),
    true,
  );
  assert.equal(
    (await state(p)).cards.some((c) => c.userId === s.id),
    false,
  );
  assert.equal(
    (
      await admin.query(
        "SELECT count(*) FROM peer_match_requests WHERE survivor_id=$1 AND status IN ('pending','accepted')",
        [s.id],
      )
    ).rows[0].count,
    "0",
  );
  await post("/v1/peers/card", publish, s.headers);
  assert.equal(
    (await post("/v1/peers/block", { targetId: s.id }, p.headers)).status,
    200,
  );
  assert.equal((await post("/v1/peers/requests", req, p.headers)).status, 404);
  assert.equal(
    (await state(p)).cards.some((c) => c.userId === s.id),
    false,
  );
  const third = await (
    await post(
      "/v1/peers/requests",
      { ...req, alias: "Explicit caregiver" },
      other.headers,
    )
  ).json();
  assert.equal(
    (await post("/v1/peers/block", { targetId: other.id }, s.headers)).status,
    200,
  );
  assert.equal((await respond(s, third.id, "accepted")).status, 409);
  assert.equal(
    (await post("/v1/peers/requests", req, other.headers)).status,
    404,
  );
  // The established deletion lifecycle must remove new private data too.
  const deletion = await store.createDeletionRequest(s.id);
  await admin.query(
    "UPDATE deletion_requests SET verified_at=now(),cooling_off_until=now() WHERE id=$1",
    [deletion.id],
  );
  assert.equal(await store.completeDeletionRequest(deletion.id), true);
  assert.equal(
    (await admin.query("SELECT 1 FROM survivor_cards WHERE user_id=$1", [s.id]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await admin.query(
        "SELECT 1 FROM peer_match_requests WHERE survivor_id=$1",
        [s.id],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (await request("/v1/peers", { headers: s.headers })).status,
    401,
  );
}
