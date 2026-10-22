import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DevelopmentFileEmailProvider,
  createEmailProvider,
} from "../server/email-provider.mjs";

test("private synthetic delivery never writes real recipients or exposes a production adapter", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mona-outbox-test-"));
  try {
    const provider = new DevelopmentFileEmailProvider(dir);
    const message = {
      to: "alice@example.test",
      template: { kind: "account_verification", text: "synthetic link" },
    };
    await provider.send(message);
    const names = await readdir(dir);
    assert.equal(names.length, 1);
    assert.deepEqual(
      JSON.parse(await readFile(join(dir, names[0]), "utf8")),
      message,
    );
    assert.equal((await stat(join(dir, names[0]))).mode & 0o777, 0o600);
    await assert.rejects(
      provider.send({ ...message, to: "real@example.com" }),
      /fictional/,
    );
    assert.equal((await readdir(dir)).length, 1);
    assert.throws(
      () =>
        createEmailProvider({
          environment: "production",
          provider: "development_file",
          outboxDirectory: dir,
        }),
      /production email adapter/,
    );
    for (const path of ["public", "dist/secrets", "src/outbox", "docs/private"])
      assert.throws(
        () => new DevelopmentFileEmailProvider(path),
        /published assets/,
      );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
