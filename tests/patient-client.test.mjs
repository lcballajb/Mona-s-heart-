import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile("src/auth/client.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { PatientClient } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("late unauthorized responses cannot erase a cleared or newer client session", async () => {
  const original = globalThis.fetch;
  let finish;
  let expired = 0;
  globalThis.fetch = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  try {
    const client = new PatientClient(() => expired++);
    const oldRequest = client.me();
    client.clear();
    finish(new globalThis.Response("{}", { status: 401 }));
    await assert.rejects(oldRequest);
    assert.equal(expired, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("current unauthorized requests clear state and always use same-origin no-store transport", async () => {
  const original = globalThis.fetch;
  let expired = 0;
  globalThis.fetch = async (path, options) => {
    assert.equal(path, "/v1/profile");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    return new globalThis.Response("{}", { status: 401 });
  };
  try {
    await assert.rejects(new PatientClient(() => expired++).profile());
    assert.equal(expired, 1);
  } finally {
    globalThis.fetch = original;
  }
});
