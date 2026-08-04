import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("AI configuration is gated by the exact approved-model allowlist", async () => {
  const source = await readFile("src/ai/providers/provider.ts", "utf8");

  assert.match(source, /APPROVED_AI_MODELS: readonly string\[\] = \[\]/);
  assert.match(source, /isApprovedAIModel\(env\.AI_PROVIDER, env\.AI_MODEL\)/);
  assert.doesNotMatch(source, /APPROVED_AI_MODELS[^=]*= \[[^\]]+\]/);
});
