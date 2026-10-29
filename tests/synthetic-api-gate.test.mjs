import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

test("new session/profile HTTP routes stay disabled without explicit synthetic opt-in", async () => {
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((r) => reservation.close(r));
  const child = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_ADAPTER: "memory",
      API_HOST: "127.0.0.1",
      API_PORT: String(port),
      SYNTHETIC_PATIENT_JOURNEY_ENABLED: "false",
      EMAIL_PROVIDER: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.resume();
  child.stderr.resume();
  const exited = once(child, "exit");
  const request = (path, method = "GET") =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      signal: globalThis.AbortSignal.timeout(1000),
    });
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (child.exitCode !== null) throw new Error("Test API failed startup");
      try {
        ready = (await request("/health/ready")).status === 200;
      } catch {}
      if (ready) break;
      await delay(100);
    }
    assert.equal(ready, true);
    for (const [path, method] of [
      ["/v1/auth/register", "POST"],
      ["/v1/auth/me", "GET"],
      ["/v1/profile", "GET"],
      ["/v1/consent-history", "GET"],
      ["/v1/peers", "GET"],
      ["/v1/peers/card", "POST"],
      ["/v1/peers/requests", "POST"],
      ["/v1/peers/respond", "POST"],
      ["/v1/peers/block", "POST"],
      ["/v1/profile", "PUT"],
    ])
      assert.equal((await request(path, method)).status, 503);
  } finally {
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  }
});
