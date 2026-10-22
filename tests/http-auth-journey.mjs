import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

// Runs against the real API and disposable PostgreSQL used by the integration
// suite. No test-only HTTP endpoint exposes verification or recovery tokens.
export async function httpAuthJourney({ admin, user, otherUser, password }) {
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ["server/index.mjs"], {
    env: { ...process.env, API_HOST: "127.0.0.1", API_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exited = once(child, "exit");
  child.stdout.resume();
  child.stderr.resume();
  const base = `http://127.0.0.1:${port}`;
  const request = (path, options) =>
    fetch(`${base}${path}`, {
      ...options,
      signal: globalThis.AbortSignal.timeout(2000),
    });
  const json = (value) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null)
        throw new Error("Test API exited before readiness");
      try {
        ready = (await request("/health/ready")).status === 200;
      } catch {
        /* bounded startup polling */
      }
      if (ready) break;
      await delay(50);
    }
    assert.equal(ready, true, "Test API must become ready");
    assert.equal((await request("/v1/auth/sessions")).status, 401);
    assert.equal(
      (
        await request(
          "/v1/auth/sign-in",
          json({ email: user.email, password: "incorrect password" }),
        )
      ).status,
      401,
    );
    const login = await request(
      "/v1/auth/sign-in",
      json({ email: user.email, password }),
    );
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly; SameSite=Strict/);
    const { csrfToken } = await login.json();
    const headers = { cookie: cookie.split(";")[0] };
    const sessions = await request("/v1/auth/sessions", { headers });
    assert.equal(sessions.status, 200);
    assert.match(sessions.headers.get("cache-control"), /no-store/);
    const ownSession = (await sessions.json()).sessions[0];
    assert.ok(ownSession.id);
    assert.equal(
      (await request("/v1/auth/sign-out", { method: "POST", headers })).status,
      403,
    );
    const otherSession = (
      await admin.query(
        "SELECT id FROM sessions WHERE user_id=$1 AND revoked_at IS NULL LIMIT 1",
        [otherUser.id],
      )
    ).rows[0];
    assert.ok(otherSession);
    assert.equal(
      (
        await request(`/v1/auth/sessions/${otherSession.id}`, {
          method: "DELETE",
          headers: { ...headers, "x-csrf-token": csrfToken },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await admin.query("SELECT revoked_at FROM sessions WHERE id=$1", [
          otherSession.id,
        ])
      ).rows[0].revoked_at,
      null,
    );
    await admin.query("UPDATE users SET status='deactivated' WHERE id=$1", [
      user.id,
    ]);
    assert.equal((await request("/v1/auth/sessions", { headers })).status, 401);
    await admin.query("UPDATE users SET status='active' WHERE id=$1", [
      user.id,
    ]);
    const logout = await request("/v1/auth/sign-out", {
      method: "POST",
      headers: { ...headers, "x-csrf-token": csrfToken },
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
    assert.equal((await request("/v1/auth/sessions", { headers })).status, 401);
  } finally {
    await admin.query("UPDATE users SET status='active' WHERE id=$1", [
      user.id,
    ]);
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  }
}
