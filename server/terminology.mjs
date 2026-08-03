import { createHash } from "node:crypto";

export const RXNORM_ORIGIN = "https://rxnav.nlm.nih.gov";
const SAFE_QUERY = /^[\p{L}\p{N} .,'()\-\/]+$/u;

export function normalizeQuery(value) {
  if (typeof value !== "string")
    throw Object.assign(new Error("Search text must be a string"), {
      statusCode: 400,
    });
  const query = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (query.length < 2 || query.length > 80 || !SAFE_QUERY.test(query))
    throw Object.assign(new Error("Enter 2–80 valid characters"), {
      statusCode: 400,
    });
  return query;
}

export function normalizeRxNormConcepts(
  concepts,
  retrievedAt = new Date().toISOString(),
) {
  const seen = new Set();
  return concepts.flatMap((raw) => {
    if (!raw || typeof raw.rxcui !== "string" || typeof raw.name !== "string")
      return [];
    const key = raw.rxcui || raw.name.toLocaleLowerCase("en-US");
    if (seen.has(key)) return [];
    seen.add(key);
    const strength = raw.name.match(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|units?(?:\/mL)?|mEq)(?:\/\w+)?\b/i,
    )?.[0];
    const doseForm = raw.name.match(
      /\b(?:oral |extended release |delayed release )?(?:tablet|capsule|solution|suspension|injection|cream|patch|inhaler)\b/i,
    )?.[0];
    const brand = raw.name.match(/\[([^\]]+)\]/)?.[1];
    const genericName = raw.name
      .replace(/\s*\[[^\]]+\]\s*/, " ")
      .replace(/\s+/g, " ")
      .trim();
    return [
      {
        rxcui: raw.rxcui,
        genericName,
        ...(brand ? { brandName: brand } : {}),
        activeIngredient: raw.ingredient ?? genericName.split(/\s+\d/)[0],
        ...(strength ? { strength } : {}),
        ...(doseForm ? { doseForm } : {}),
        prescribableName: raw.name,
        termType: raw.tty ?? "UNKNOWN",
        source: "RxNorm (U.S. National Library of Medicine)",
        retrievedAt,
        verificationStatus: "verified",
      },
    ];
  });
}

export class TerminologyCache {
  constructor({
    ttlMs = 15 * 60_000,
    negativeTtlMs = 60_000,
    maxEntries = 500,
    clock = Date.now,
  } = {}) {
    Object.assign(this, { ttlMs, negativeTtlMs, maxEntries, clock });
    this.rows = new Map();
  }
  key(provider, query) {
    return createHash("sha256")
      .update(`${provider}\0${query.toLocaleLowerCase("en-US")}`)
      .digest("hex");
  }
  get(provider, query) {
    const key = this.key(provider, query);
    const row = this.rows.get(key);
    if (!row || row.expiresAt <= this.clock()) {
      this.rows.delete(key);
      return null;
    }
    return row.value;
  }
  set(provider, query, value) {
    if (this.rows.size >= this.maxEntries)
      this.rows.delete(this.rows.keys().next().value);
    this.rows.set(this.key(provider, query), {
      value,
      expiresAt:
        this.clock() + (value.length ? this.ttlMs : this.negativeTtlMs),
    });
  }
  clear() {
    this.rows.clear();
  }
}

export class RxNormProvider {
  constructor({
    fetchImpl = fetch,
    timeoutMs = 3000,
    retries = 1,
    cache = new TerminologyCache(),
    enabled = process.env.RXNORM_PROXY_ENABLED === "true",
    clock = Date.now,
  } = {}) {
    Object.assign(this, {
      fetchImpl,
      timeoutMs,
      retries,
      cache,
      enabled,
      clock,
    });
    this.failures = 0;
    this.openUntil = 0;
  }
  async search(input) {
    const query = normalizeQuery(input);
    if (!this.enabled)
      return {
        results: [],
        fallback: true,
        reason: "disabled",
        cacheHit: false,
      };
    const cached = this.cache.get("rxnorm", query);
    if (cached) return { results: cached, fallback: false, cacheHit: true };
    if (this.openUntil > this.clock())
      throw Object.assign(
        new Error("Medication terminology is temporarily unavailable"),
        { statusCode: 503, code: "CIRCUIT_OPEN" },
      );
    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const url = new URL("/REST/approximateTerm.json", RXNORM_ORIGIN);
        url.searchParams.set("term", query);
        url.searchParams.set("maxEntries", "20");
        url.searchParams.set("option", "1");
        const response = await this.fetchImpl(url, {
          signal: controller.signal,
          headers: {
            accept: "application/json",
            "user-agent": "MonasHeart-Terminology/1.0",
          },
        });
        if (!response.ok) throw new Error(`RxNorm status ${response.status}`);
        const payload = await response.json();
        const candidates = payload?.approximateGroup?.candidate;
        if (!Array.isArray(candidates))
          throw new Error("Invalid RxNorm response");
        const results = normalizeRxNormConcepts(
          candidates.map((x) => ({
            rxcui: String(x.rxcui ?? ""),
            name: String(x.name ?? x.rxcui ?? ""),
            tty: x.tty,
          })),
        );
        this.cache.set("rxnorm", query, results);
        this.failures = 0;
        return { results, fallback: false, cacheHit: false };
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
    }
    this.failures += 1;
    if (this.failures >= 3) this.openUntil = this.clock() + 30_000;
    throw Object.assign(
      new Error(
        lastError?.name === "AbortError"
          ? "Medication search timed out"
          : "Medication terminology is unavailable",
      ),
      {
        statusCode: 503,
        code:
          lastError?.name === "AbortError" ? "TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      },
    );
  }
  health() {
    return {
      provider: "RxNorm",
      enabled: this.enabled,
      circuit: this.openUntil > this.clock() ? "open" : "closed",
    };
  }
}

export class DiagnosisTerminologyProvider {
  constructor({ system, version, region, language = "en", search }) {
    Object.assign(this, { system, version, region, language, search });
  }
}

export const createTerminologyRecord = (value) => ({
  code: value.code,
  display: value.display,
  system: value.system,
  version: value.version ?? null,
  source: value.source,
  retrievalDate: value.retrievalDate,
  userWording: value.userWording ?? null,
  verificationStatus: value.verificationStatus ?? "unverified",
  region: value.region,
  language: value.language ?? "en",
  status: value.status ?? "active",
});

export const createObservationTerm = (value) => ({
  code: value.code,
  display: value.display,
  system: value.system,
  version: value.version ?? null,
  unit: value.unit ?? null,
  region: value.region,
  language: value.language ?? "en",
  source: value.source,
  reviewDate: value.reviewDate,
});
