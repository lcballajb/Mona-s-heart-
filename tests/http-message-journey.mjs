import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { PostgresStore } from "../server/postgres-store.mjs";
import { createPool } from "../server/database.mjs";
import { messageKey } from "../server/message-security.mjs";

export async function httpMessageJourney({ request, admin, store, key }) {
  const post = (path, body, headers) =>
    request(path, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  async function account(role) {
    const email = `message-${randomUUID()}@example.test`,
      password = "synthetic message password 123";
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
    assert.equal(
      (
        await request("/v1/profile", {
          method: "PUT",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({
            displayName: "Private synthetic",
            onboarding: {
              consent: true,
              consentVersion: "synthetic-onboarding-v1",
              privacy: "private",
            },
          }),
        })
      ).status,
      200,
    );
    return { id: user.id, headers };
  }
  const p = await account("patient"),
    s = await account("survivor"),
    other = await account("caregiver");
  const card = {
    alias: "Synthetic messaging survivor",
    introduction: "",
    availability: "",
    published: true,
    consent: true,
    version: "synthetic-discovery-v1",
  };
  assert.equal((await post("/v1/peers/card", card, s.headers)).status, 200);
  async function connect() {
    const response = await post(
      "/v1/peers/requests",
      {
        survivorId: s.id,
        alias: "Synthetic patient",
        consent: true,
        version: "synthetic-match-request-v1",
      },
      p.headers,
    );
    assert.equal(response.status, 200);
    const { id } = await response.json();
    return id;
  }
  const path = (id) => `/v1/peer-messages/${id}`;
  const get = (u, id, query = "") =>
    request(path(id) + query, { headers: u.headers });
  const send = (u, id, body = "Synthetic hello", clientId = randomUUID()) =>
    post(path(id), { body, clientId }, u.headers);
  const accept = async (id) =>
    assert.equal(
      (
        await post(
          "/v1/peers/respond",
          { requestId: id, action: "accepted" },
          s.headers,
        )
      ).status,
      200,
    );
  const withdraw = async (id) =>
    assert.equal(
      (
        await post(
          "/v1/peers/respond",
          { requestId: id, action: "withdrawn" },
          p.headers,
        )
      ).status,
      200,
    );
  const id = await connect();
  assert.equal((await get(p, id)).status, 404);
  assert.equal((await send(s, id)).status, 404);
  await accept(id);
  assert.deepEqual((await (await get(p, id)).json()).messages, []);
  assert.equal((await request(path(id))).status, 401);
  assert.equal((await get(other, id)).status, 404);
  assert.equal((await send(other, id)).status, 404);
  assert.equal(
    (
      await post(
        path(id),
        { body: "Synthetic", clientId: randomUUID() },
        { cookie: p.headers.cookie },
      )
    ).status,
    403,
  );
  for (const body of ["", " ", "x".repeat(2001), "a\u0000b"])
    assert.equal((await send(p, id, body)).status, 400);
  assert.equal((await get(p, id, "?before=invalid")).status, 400);
  const clientId = randomUUID().toUpperCase(),
    body = "Synthetic <img src=x onerror=alert(1)> message";
  const duplicate = await Promise.all([
    send(p, id.toUpperCase(), body, clientId),
    send(p, id.toUpperCase(), body, clientId),
  ]);
  assert.equal(duplicate[0].status, 200);
  assert.equal(duplicate[1].status, 200);
  assert.deepEqual(await duplicate[0].json(), await duplicate[1].json());
  assert.equal(
    (await send(p, id, "Different synthetic text", clientId)).status,
    409,
  );
  assert.equal((await send(s, id, "Synthetic reply")).status, 200);
  const history = await (await get(p, id)).json();
  assert.deepEqual(
    history.messages.map((m) => m.body),
    [body, "Synthetic reply"],
  );
  assert.deepEqual(
    (await (await get(s, id)).json()).messages,
    history.messages,
  );
  // A fresh pool/store reads the same encrypted history with the external key.
  const secondPool = createPool();
  try {
    await secondPool.query(
      "SET default_transaction_isolation='repeatable read'",
    );
    const second = new PostgresStore(secondPool);
    const isolation = await second.asUser(p.id, (tx) =>
      tx.query("SHOW transaction_isolation"),
    );
    assert.equal(isolation.rows[0].transaction_isolation, "read committed");
    const session = await store.session(
      decodeURIComponent(p.headers.cookie.split("=")[1]),
    );
    assert.deepEqual(
      (
        await second.messageOperation(
          p.id,
          session.id,
          id,
          null,
          null,
          messageKey(key),
        )
      ).messages,
      history.messages,
    );
  } finally {
    await secondPool.end();
  }
  const stored = (
    await admin.query(
      "SELECT body_ciphertext FROM peer_messages WHERE connection_id=$1",
      [id],
    )
  ).rows;
  assert.equal(stored.length, 2);
  assert.equal(
    stored.some((m) => m.body_ciphertext.includes(Buffer.from("Synthetic"))),
    false,
  );
  assert.equal(
    (
      await store.asUser(other.id, (tx) =>
        tx.query("SELECT * FROM peer_messages WHERE connection_id=$1", [id]),
      )
    ).rowCount,
    0,
  );
  await assert.rejects(
    store.asUser(other.id, (tx) =>
      tx.query(
        "INSERT INTO peer_messages(connection_id,sender_id,client_id,body_ciphertext) VALUES($1,$2,$3,$4)",
        [id, p.id, randomUUID(), Buffer.alloc(32)],
      ),
    ),
  );
  await assert.rejects(
    store.asUser(p.id, (tx) =>
      tx.query(
        "UPDATE peer_messages SET body_ciphertext=$1 WHERE connection_id=$2",
        [Buffer.alloc(32), id],
      ),
    ),
  );
  await assert.rejects(
    store.asUser(p.id, (tx) =>
      tx.query("DELETE FROM peer_messages WHERE connection_id=$1", [id]),
    ),
  );
  await admin.query("UPDATE users SET status='deactivated' WHERE id=$1", [
    s.id,
  ]);
  assert.equal((await get(p, id)).status, 404);
  assert.equal((await send(p, id)).status, 404);
  assert.equal((await get(s, id)).status, 401);
  await admin.query("UPDATE users SET status='active' WHERE id=$1", [s.id]);
  await admin.query(
    "DELETE FROM user_roles WHERE user_id=$1 AND role_code='survivor'",
    [s.id],
  );
  assert.equal((await get(p, id)).status, 404);
  await admin.query(
    "INSERT INTO user_roles(user_id,role_code) VALUES($1,'survivor')",
    [s.id],
  );
  await admin.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
    [p.id],
  );
  assert.equal((await get(p, id)).status, 401);
  assert.equal((await send(p, id)).status, 401);
  await admin.query(
    "UPDATE sessions SET expires_at=now()+interval '30 minutes' WHERE user_id=$1",
    [p.id],
  );
  // Durable quota cannot be reset by changing connection or process.
  for (let i = 1; i < 30; i++)
    assert.equal((await send(p, id, `Synthetic rate ${i}`)).status, 200);
  assert.equal((await send(p, id)).status, 429);
  assert.equal((await send(p, id, body, clientId)).status, 200);
  await withdraw(id);
  assert.equal((await get(s, id)).status, 404);
  assert.equal((await send(s, id)).status, 404);
  const secondId = await connect();
  await accept(secondId);
  assert.equal((await send(p, secondId)).status, 429);
  await admin.query(
    "UPDATE peer_message_limits SET window_start=now()-interval '2 minutes' WHERE user_id=$1",
    [p.id],
  );
  assert.equal((await send(p, secondId)).status, 200);
  // Hold the account lock, commit withdrawal while both HTTP reads and sends wait.
  await admin.query("BEGIN");
  let reading, writing;
  try {
    await admin.query(
      "SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
      [[p.id, s.id]],
    );
    reading = get(s, secondId);
    writing = send(p, secondId);
    let waiting = false;
    for (let i = 0; i < 50; i++) {
      const result = await admin.query(
        "SELECT count(*) FROM pg_stat_activity WHERE usename=$1 AND wait_event_type='Lock'",
        [process.env.DB_RUNTIME_USER],
      );
      if (Number(result.rows[0].count) >= 2) {
        waiting = true;
        break;
      }
      await delay(10);
    }
    assert.equal(
      waiting,
      true,
      "Both message operations reached the locked account boundary",
    );
    await admin.query(
      "UPDATE peer_match_requests SET status='withdrawn' WHERE id=$1",
      [secondId],
    );
    await admin.query("COMMIT");
  } catch (error) {
    await admin.query("ROLLBACK");
    throw error;
  }
  assert.equal((await reading).status, 404);
  assert.equal((await writing).status, 404);
  const thirdId = await connect();
  await accept(thirdId);
  assert.equal((await send(s, thirdId)).status, 200);
  // Page the complete persisted history, including messages beyond the first 100.
  for (let i = 0; i < 101; i++) {
    if (i % 25 === 0)
      await admin.query(
        "UPDATE peer_message_limits SET window_start=now()-interval '2 minutes' WHERE user_id=$1",
        [p.id],
      );
    assert.equal(
      (await send(p, thirdId, `Synthetic history ${i}`)).status,
      200,
    );
  }
  const latest = await (await get(p, thirdId)).json();
  assert.equal(latest.messages.length, 100);
  assert.ok(latest.before);
  const earlier = await (
    await get(p, thirdId, `?before=${latest.before}`)
  ).json();
  assert.equal(earlier.messages.length, 2);
  assert.equal(earlier.before, null);
  assert.equal(
    new Set([...earlier.messages, ...latest.messages].map((m) => m.id)).size,
    102,
  );
  // A block in either direction immediately hides existing history in RLS.
  await admin.query("BEGIN");
  let blockedRead, blockedSend;
  try {
    await admin.query(
      "SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
      [[p.id, s.id]],
    );
    blockedRead = get(s, thirdId);
    blockedSend = send(s, thirdId);
    let waiting = false;
    for (let i = 0; i < 50; i++) {
      const result = await admin.query(
        "SELECT count(*) FROM pg_stat_activity WHERE usename=$1 AND wait_event_type='Lock'",
        [process.env.DB_RUNTIME_USER],
      );
      if (Number(result.rows[0].count) >= 2) {
        waiting = true;
        break;
      }
      await delay(10);
    }
    assert.equal(
      waiting,
      true,
      "Both operations reached concurrent block boundary",
    );
    await admin.query(
      "INSERT INTO blocks(blocker_id,blocked_id) VALUES($1,$2)",
      [s.id, p.id],
    );
    await admin.query("COMMIT");
  } catch (error) {
    await admin.query("ROLLBACK");
    throw error;
  }
  assert.equal((await blockedRead).status, 404);
  assert.equal((await blockedSend).status, 404);
  assert.equal((await get(p, thirdId)).status, 404);
  assert.equal((await send(s, thirdId)).status, 404);
  assert.equal(
    (
      await store.asUser(p.id, (tx) =>
        tx.query("SELECT * FROM peer_messages WHERE connection_id=$1", [
          thirdId,
        ]),
      )
    ).rowCount,
    0,
  );
  const deletion = await store.createDeletionRequest(s.id);
  await admin.query(
    "UPDATE deletion_requests SET verified_at=now(),cooling_off_until=now() WHERE id=$1",
    [deletion.id],
  );
  assert.equal(await store.completeDeletionRequest(deletion.id), true);
  assert.equal(
    (
      await admin.query(
        "SELECT * FROM peer_messages WHERE connection_id=ANY($1::uuid[])",
        [[id, secondId, thirdId]],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await admin.query("SELECT * FROM peer_message_limits WHERE user_id=$1", [
        s.id,
      ])
    ).rowCount,
    0,
  );
}
