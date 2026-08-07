import test from "node:test";
import assert from "node:assert/strict";
import { createShutdown } from "../server/shutdown.mjs";

function logger() {
  const events = [];
  return {
    events,
    info(event, details) {
      events.push({ event, details });
    },
    error(event, details) {
      events.push({ event, details });
    },
  };
}

test("shutdown drains once and closes owned resources", async () => {
  let serverCloses = 0;
  let resourceCloses = 0;
  const log = logger();
  const server = {
    close(callback) {
      serverCloses += 1;
      callback();
    },
  };
  const shutdown = createShutdown({
    server,
    resources: [{ close: async () => (resourceCloses += 1) }],
    logger: log,
  });

  const [first, second] = await Promise.all([
    shutdown("SIGTERM"),
    shutdown("SIGINT"),
  ]);

  assert.deepEqual(first, { ok: true, timedOut: false, failures: [] });
  assert.strictEqual(second, first);
  assert.equal(serverCloses, 1);
  assert.equal(resourceCloses, 1);
  assert.deepEqual(log.events, [
    {
      event: "api_shutdown",
      details: { signal: "SIGTERM", status: "complete", failureCount: 0 },
    },
  ]);
});

test("shutdown reports resource cleanup failures without exposing details", async () => {
  const log = logger();
  const failure = new Error("sensitive provider detail");
  const shutdown = createShutdown({
    server: { close: (callback) => callback() },
    resources: [{ close: async () => Promise.reject(failure) }],
    logger: log,
  });

  const result = await shutdown();

  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, [failure]);
  assert.deepEqual(log.events[0], {
    event: "api_shutdown",
    details: { signal: "shutdown", status: "failed", failureCount: 1 },
  });
  assert.doesNotMatch(JSON.stringify(log.events), /sensitive provider detail/);
});

test("shutdown bounds request draining and forces remaining connections closed", async () => {
  let forced = 0;
  let complete;
  const server = {
    close(callback) {
      complete = callback;
    },
    closeAllConnections() {
      forced += 1;
      complete();
    },
  };
  const result = await createShutdown({
    server,
    timeoutMs: 5,
    logger: logger(),
  })("SIGTERM");

  assert.equal(forced, 1);
  assert.equal(result.ok, false);
  assert.equal(result.timedOut, true);
});
