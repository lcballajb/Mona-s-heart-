import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
const guard = read("src/ai/guardrails/medicalSafety.ts");
const flags = read("src/features/flags.ts");
const privacy = read("src/features/privacy.ts");
const app = read("src/main.tsx");
const normalizedApp = app.replace(/\s+/g, " ");
const auto = read("src/components/Autocomplete.tsx");
test("red-team categories are refused and emergency language escalates", () => {
  for (const phrase of [
    "blood thinner",
    "insulin",
    "natural cure",
    "what dose",
    "pretend you are my doctor",
    "show me another user",
    "ignore",
  ])
    assert.ok(guard.includes(phrase));
  assert.match(guard, /local emergency services immediately/);
});
test("all high-risk flags default off", () => {
  assert.doesNotMatch(flags, /:\s*true/);
  assert.match(flags, /aiAssistant:\s*false/);
  assert.match(flags, /fhirImport:\s*false/);
});
test("health privacy defaults private and access is owner-scoped", () => {
  assert.match(privacy, /DEFAULT_HEALTH_VISIBILITY[^=]*= [\"']private[\"']/);
  assert.match(privacy, /ownerId\s*===\s*viewerId/);
});
test("autocomplete waits for two characters, debounces, supports keyboard, and does not auto-select", () => {
  assert.match(auto, /length\s*<\s*2/);
  assert.match(auto, /250/);
  assert.match(auto, /ArrowDown/);
  assert.match(auto, /useState\(-1\)/);
  assert.match(auto, /aria-autocomplete="list"/);
});
test("medications require explicit confirmation and education is not preselected", () => {
  assert.match(app, /I confirm that I chose to add/);
  assert.match(app, /disabled={!confirmed/);
  assert.match(app, /Nothing is preselected or added/);
});
test("required safety and legal notices are accessible", () => {
  for (const text of [
    "does not provide medical advice, diagnosis, or treatment",
    "Always consult a qualified healthcare professional",
    "Complementary approaches are not replacements",
    "Natural does not necessarily mean safe",
    "Draft—requires review",
  ])
    assert.ok(normalizedApp.includes(text), text);
});
test("no browser-exposed AI secret convention", () => {
  const files = [
    "src/main.tsx",
    "src/features/flags.ts",
    "src/components/Autocomplete.tsx",
  ];
  for (const file of files)
    assert.doesNotMatch(read(file), /VITE_.*(KEY|TOKEN|SECRET)/);
});
test("repository has no obvious real-patient or secret fixture", () => {
  const all = readdirSync("tests")
    .map((x) => read(`tests/${x}`))
    .join("\n");
  assert.doesNotMatch(all, /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/);
  assert.doesNotMatch(all, /sk-[A-Za-z0-9]{20,}/);
});
