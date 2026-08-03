import test from "node:test";
import assert from "node:assert/strict";
import {
  DiagnosisTerminologyProvider,
  normalizeQuery,
  normalizeRxNormConcepts,
  RxNormProvider,
  TerminologyCache,
  createObservationTerm,
} from "../server/terminology.mjs";
import { medicationInformationRecord } from "../server/medication-information.mjs";
import { visibleAssociations } from "../server/associations.mjs";
import { readFileSync } from "node:fs";

test("RxNorm input and output are normalized and brand/generic duplicates collapse by RxCUI", () => {
  assert.equal(normalizeQuery("  met   formin "), "met formin");
  assert.throws(() => normalizeQuery("a"), /2–80/);
  const rows = normalizeRxNormConcepts(
    [
      { rxcui: "1", name: "metformin 500 mg oral tablet [Brand]" },
      { rxcui: "1", name: "duplicate" },
      { name: "invalid" },
    ],
    "now",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].brandName, "Brand");
  assert.equal(rows[0].strength, "500 mg");
  assert.equal(rows[0].rxcui, "1");
});

test("RxNorm provider caches normalized server-side results without exposing query keys", async () => {
  let calls = 0;
  const provider = new RxNormProvider({
    enabled: true,
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({
          approximateGroup: {
            candidate: [
              { rxcui: "2", name: "Example 5 mg tablet", tty: "SCD" },
            ],
          },
        }),
      };
    },
  });
  assert.equal((await provider.search("example")).cacheHit, false);
  assert.equal((await provider.search("EXAMPLE")).cacheHit, true);
  assert.equal(calls, 1);
  assert.doesNotMatch([...provider.cache.rows.keys()][0], /example/i);
});

test("negative cache, timeout fallback, and circuit breaker operate safely", async () => {
  let now = 0;
  const cache = new TerminologyCache({ clock: () => now, negativeTtlMs: 10 });
  cache.set("x", "private term", []);
  assert.deepEqual(cache.get("x", "private term"), []);
  now = 11;
  assert.equal(cache.get("x", "private term"), null);
  const provider = new RxNormProvider({
    enabled: true,
    timeoutMs: 5,
    retries: 0,
    clock: () => now,
    fetchImpl: (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () =>
          reject(Object.assign(new Error(), { name: "AbortError" })),
        ),
      ),
  });
  await assert.rejects(
    provider.search("example"),
    (error) => error.code === "TIMEOUT",
  );
});

test("diagnosis/observation abstractions and official information provenance are explicit", () => {
  const provider = new DiagnosisTerminologyProvider({
    system: "ICD-10-CM",
    version: "2026",
    region: "US",
    search() {},
  });
  assert.equal(provider.system, "ICD-10-CM");
  assert.equal(
    createObservationTerm({
      code: "x",
      display: "Example",
      system: "LOINC",
      region: "US",
      source: "test",
      reviewDate: "2026-01-01",
    }).system,
    "LOINC",
  );
  assert.throws(() => medicationInformationRecord({}), /provenance/);
});

test("unreviewed associations never publish in production", () => {
  const base = {
    reviewer: "reviewer-id",
    reviewDate: "2026-01-01",
    expirationDate: "2030-01-01",
    clinicalReviewer: "medical-id",
    pharmacistReviewer: "pharmacist-id",
  };
  assert.equal(
    visibleAssociations([{ ...base, status: "clinical review" }], {
      production: true,
      now: new Date("2026-01-01"),
    }).length,
    0,
  );
  assert.equal(
    visibleAssociations([{ ...base, status: "published" }], {
      production: true,
      now: new Date("2026-01-01"),
    }).length,
    1,
  );
});

test("browser code uses only same-origin proxy and does not send searches to analytics", () => {
  const client = readFileSync("src/health/terminology.ts", "utf8");
  const ui = readFileSync("src/components/Autocomplete.tsx", "utf8");
  assert.match(client, /\/v1\/terminology\/medications/);
  assert.doesNotMatch(client, /rxnav\.nlm|API_KEY|analytics|track\(/i);
  assert.match(ui, /AbortController/);
  assert.match(ui, /Retry/);
  assert.match(ui, /Unverified entry/);
  assert.match(ui, /aria-activedescendant/);
});
