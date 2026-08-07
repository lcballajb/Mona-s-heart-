import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditRepository } from "../scripts/repository-audit.mjs";

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), "mona-repository-audit-"));
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content);
  }
  return root;
}

test("repository audit accepts indexed documents and valid local links", async (t) => {
  const root = await fixture({
    "docs/README.md": "# Index\n\n- [Guide](guide.md)\n",
    "docs/guide.md": "# Guide\n\nSee the [root](../README.md).\n",
    "README.md": "# Example\n",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  assert.deepEqual((await auditRepository(root)).findings, []);
});

test("repository audit reports stabilization regressions together", async (t) => {
  const root = await fixture({
    "docs/README.md": "# Index\n",
    "docs/orphan.md": "[missing](missing.md)\n<<<<<<< HEAD\n",
    "copy-a.txt": "same\n",
    "copy-b.txt": "same\n",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const kinds = (await auditRepository(root)).findings.map(({ kind }) => kind);
  assert.deepEqual(kinds.sort(), [
    "broken-link",
    "duplicate",
    "merge-marker",
    "orphan-document",
  ]);
});
