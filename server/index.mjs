import http from "node:http";
import { createStore } from "./store-factory.mjs";
import { MonaService } from "./service.mjs";
import { RxNormProvider, TerminologyCache } from "./terminology.mjs";

const store = await createStore();
const service = new MonaService(store);
const rxnorm = new RxNormProvider({
  enabled: process.env.RXNORM_PROXY_ENABLED === "true",
  timeoutMs: Number(process.env.RXNORM_TIMEOUT_MS ?? 3000),
  cache: new TerminologyCache({
    ttlMs: Number(process.env.RXNORM_CACHE_TTL_MS ?? 900_000),
    negativeTtlMs: Number(process.env.RXNORM_NEGATIVE_CACHE_TTL_MS ?? 60_000),
  }),
});
const rateBuckets = new Map();
const production = process.env.NODE_ENV === "production";
if (production && (!process.env.DATABASE_URL || !process.env.SESSION_PEPPER))
  throw new Error(
    "Production secrets and PostgreSQL configuration are required",
  );

function cookies(request) {
  return Object.fromEntries(
    (request.headers.cookie ?? "")
      .split(";")
      .filter(Boolean)
      .map((part) => part.trim().split("=").map(decodeURIComponent)),
  );
}
async function body(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 32_768)
      throw Object.assign(new Error("Payload too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function reply(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}
const server = http.createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    const rateKey = `${request.socket.remoteAddress}:${path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(rateKey) ?? {
      count: 0,
      resetsAt: now + 60_000,
    };
    if (bucket.resetsAt <= now) {
      bucket.count = 0;
      bucket.resetsAt = now + 60_000;
    }
    bucket.count += 1;
    rateBuckets.set(rateKey, bucket);
    const limit =
      path === "/v1/auth/sign-in"
        ? 10
        : path === "/v1/terminology/medications"
          ? 30
          : 120;
    if (bucket.count > limit)
      return reply(
        response,
        429,
        { error: "Too many requests", code: "RATE_LIMITED" },
        { "retry-after": String(Math.ceil((bucket.resetsAt - now) / 1000)) },
      );
    if (production && request.headers["x-forwarded-proto"] !== "https")
      return reply(response, 426, { error: "HTTPS required" });
    if (request.method === "GET" && path === "/v1/terminology/health")
      return reply(response, 200, rxnorm.health());
    if (request.method === "GET" && path === "/v1/terminology/medications") {
      const query = new URL(request.url, "http://localhost").searchParams.get(
        "q",
      );
      const result = await rxnorm.search(query);
      return reply(response, 200, result);
    }
    if (request.method === "POST" && path === "/v1/auth/register") {
      await service.register(await body(request));
      return reply(response, 202, { status: "verification_pending" });
    }
    if (request.method === "POST" && path === "/v1/auth/verify")
      return reply(
        response,
        204,
        await service.verifyEmail((await body(request)).token),
      );
    if (request.method === "POST" && path === "/v1/auth/sign-in") {
      const result = await service.signIn(await body(request));
      return reply(
        response,
        200,
        { csrfToken: result.csrfToken, expiresAt: result.expiresAt },
        {
          "set-cookie": `mh_session=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${production ? "; Secure" : ""}`,
        },
      );
    }
    const sessionToken = cookies(request).mh_session;
    const actor = await service.actor(sessionToken);
    if (!actor)
      return reply(response, 401, { error: "Authentication required" });
    const session = await store.session(sessionToken);
    if (
      !["GET", "HEAD"].includes(request.method) &&
      !(await store.validateCsrf(session, request.headers["x-csrf-token"]))
    )
      return reply(response, 403, { error: "CSRF validation failed" });
    if (request.method === "POST" && path === "/v1/auth/sign-out") {
      await service.signOut(sessionToken);
      return reply(
        response,
        204,
        {},
        {
          "set-cookie":
            "mh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        },
      );
    }
    if (request.method === "GET" && path === "/v1/account/export")
      return reply(response, 202, await service.exportData(actor));
    if (request.method === "DELETE" && path === "/v1/account") {
      await service.deleteAccount(actor);
      return reply(response, 202, { status: "deletion_pending" });
    }
    return reply(response, 404, { error: "Not found" });
  } catch (error) {
    reply(response, error.statusCode ?? 500, {
      error: error.statusCode ? error.message : "Internal server error",
    });
  }
});

const port = Number(process.env.API_PORT ?? 3001);
server.listen(port, process.env.API_HOST ?? "127.0.0.1", () =>
  process.stdout.write(`Mona's Heart API listening on ${port}\n`),
);
